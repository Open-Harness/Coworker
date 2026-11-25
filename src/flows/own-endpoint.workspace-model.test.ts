import { runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { FAKE_ENDPOINT, FAKE_KEYS, modelCallsSeen, type SeenCall } from "~/modules/models/testing.ts";
import type { ManagerApi } from "~/modules/manager/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { CreateManagerResult } from "~/modules/workspace/types.ts";
import type { CreateWorkspaceResult } from "~/modules/workspaces/types.ts";
import { type Browser, bindings, eventually, json, signUp } from "../../test/flows.ts";
import { board, chatLog, say, type Team } from "../../test/team.ts";

/*
 * Support tests, in a project where managers think through their workspace, not the script. The model is a scripted
 * server that is the workspace's own endpoint (or an Anthropic key), answering in workerd's outside handler.
 */

const ENDPOINT_KEY = "endpoint-key";

interface Setup {
  readonly owner: Browser;
  readonly workspaceId: string;
  readonly path: string;
  readonly objectId: string;
}

async function workspace(address: string): Promise<Setup> {
  const owner = await signUp(`${address}@example.test`, "Ama");
  const created = await json<CreateWorkspaceResult>(await owner.send("POST", "/api/workspaces", { name: address, address, region: "eu" }));
  if (created._tag !== "Created") throw new Error(created._tag);
  const { workspaceId } = created.workspace;
  const row = await bindings.AUTH.prepare(`SELECT "objectId" FROM "workspace_directory" WHERE "workspaceId" = ?`)
    .bind(workspaceId)
    .first<{ objectId: string }>();
  return { owner, workspaceId, path: `/api/workspaces/${workspaceId}`, objectId: row?.objectId ?? "" };
}

const addEndpoint = ({ owner, path }: Setup): Promise<Response> =>
  owner.send("POST", `${path}/models`, { source: "endpoint", label: "Our models", baseUrl: FAKE_ENDPOINT, key: ENDPOINT_KEY });

const tryLaunch = async ({ owner, path }: Setup): Promise<CreateManagerResult> =>
  json<CreateManagerResult>(await owner.send("POST", `${path}/managers`, { name: "Launch", template: "kanban" }));

/** A manager made in the workspace, reached over HTTP. */
async function launch(setup: Setup): Promise<Team> {
  const made = await tryLaunch(setup);
  if (made._tag !== "Created") throw new Error(JSON.stringify(made));
  const { owner, path } = setup;
  return { owner, workspace: path, base: `${path}/managers/${made.manager.managerId}`, manager: made.manager };
}

const workspaceStub = (setup: Setup): WorkspaceApi =>
  bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(setup.objectId)) as unknown as WorkspaceApi;

/** Every row of every table in an object, blobs as text: what anything that can read its storage can read. */
const storedText = (stub: DurableObjectStub): Promise<string> =>
  runInDurableObject(stub, (_instance, state) => {
    const { sql } = state.storage;
    const text = (value: SqlStorageValue): string => (value instanceof ArrayBuffer ? new TextDecoder().decode(value) : String(value));
    return sql
      .exec<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE '_cf_%'")
      .toArray()
      .flatMap(({ name }) =>
        sql
          .exec(`SELECT * FROM "${name}"`)
          .toArray()
          .flatMap((row) => Object.values(row).map(text)),
      )
      .join("\n");
  });

const callsSince = (start: number): readonly SeenCall[] => modelCallsSeen.slice(start);

const managerLines = async (team: Team) => (await chatLog(team)).filter(({ role }) => role === "manager").map(({ text }) => text);

describe("a manager that thinks with its workspace's own model", () => {
  it("answers and calls an action tool through the workspace's endpoint, and no key reaches the manager", async () => {
    const start = modelCallsSeen.length;
    const setup = await workspace("own-endpoint");
    expect((await addEndpoint(setup)).status).toBe(201);
    const team = await launch(setup);

    const hello = await say(team, "hello there", "hello-1");
    expect(hello.status).toBe(202);
    const greeted = await eventually(
      () => managerLines(team),
      (lines) => lines.includes("Hello, I am scripted-mini."),
    );
    expect(greeted).toContain("Hello, I am scripted-mini.");

    await say(team, "add a task: Write the launch post", "task-1");
    const tasks = await eventually(
      async () => (await board(team)).tasks,
      (found) => found.length === 1,
    );
    expect(tasks[0]).toMatchObject({ id: "DT-1", title: "Write the launch post" });
    const lines = await eventually(
      () => chatLog(team),
      (found) => found.some(({ role, text }) => role === "manager" && text.startsWith("Done.")),
    );
    expect(lines.some(({ role, text }) => role === "action" && text.startsWith("task_create:"))).toBe(true);

    // The endpoint saw the workspace's credential, the workspace's chosen model, and the manager's tools. It never saw
    // the manager's placeholder or its model name.
    const calls = callsSince(start).filter(({ host, path }) => host === "models.example.test" && path === "/v1/chat/completions");
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(calls.every(({ credential, model }) => credential === "right" && model === "scripted-mini")).toBe(true);
    expect(calls.some(({ tools }) => tools.includes("task_create"))).toBe(true);
  });

  it("holds no key in the manager's storage or in anything the manager's calls return", async () => {
    const setup = await workspace("keyless");
    await addEndpoint(setup);
    const team = await launch(setup);
    await say(team, "add a task: Check the billing page", "task-1");
    await eventually(
      () => chatLog(team),
      (found) => found.some(({ role, text }) => role === "manager" && text.startsWith("Done.")),
    );

    const manager = bindings.MANAGER.get(bindings.MANAGER.idFromString(team.manager.objectId));
    const object = manager as unknown as ManagerApi;
    const home = workspaceStub(setup);
    const results = [
      await object.describe(),
      await object.board(),
      await object.conversation(),
      await object.pages(),
      await object.search("billing"),
      await object.chat({ text: "ok", by: { id: "email:ama@keyless.test", name: "Ama" }, requestId: "later" }),
      await object.provision({ ...team.manager, workspaceId: setup.workspaceId, createdBy: "x", workspaceObjectId: setup.objectId }),
      await home.modelRoute(),
      await home.modelReadiness(),
      await home.modelConnections(),
      await home.secrets(),
      await home.auditLog(50),
      await home.managers(),
    ];
    const everything = [await storedText(manager), JSON.stringify(results)].join("\n");
    for (const key of [ENDPOINT_KEY, FAKE_KEYS.anthropic, FAKE_KEYS.openai]) expect(everything).not.toContain(key);
    // The workspace did use its key, and its audit log says so by the secret's name only.
    const stored = await storedText(bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(setup.objectId)));
    expect(stored).toMatch(/secret\.use\nmodel:endpoint_/u);
    expect(stored).not.toContain(ENDPOINT_KEY);
  });

  it("answers through an Anthropic key and calls its tool in Anthropic's own format", async () => {
    const start = modelCallsSeen.length;
    const setup = await workspace("anthropic-own");
    await setup.owner.send("POST", `${setup.path}/models`, { source: "anthropic", key: FAKE_KEYS.anthropic });
    const team = await launch(setup);
    await say(team, "add a task: Plan the offsite", "task-1");
    const tasks = await eventually(
      async () => (await board(team)).tasks,
      (found) => found.length === 1,
    );
    expect(tasks[0]).toMatchObject({ title: "Plan the offsite" });
    expect(
      await eventually(
        () => managerLines(team),
        (lines) => lines.some((line) => line.startsWith("Done.")),
      ),
    ).toHaveLength(1);
    const calls = callsSince(start).filter(({ host }) => host === "api.anthropic.com");
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls.every(({ credential, model }) => credential === "right" && model === "claude-sonnet-test")).toBe(true);
    expect(calls.every(({ headerNames }) => !headerNames.includes("authorization"))).toBe(true);
  });

  it("carries a slow streamed answer from the workspace to the manager whole", async () => {
    const setup = await workspace("slow-stream");
    await addEndpoint(setup);
    const team = await launch(setup);
    await say(team, "take your time. add a task: Slow one", "slow-1");
    const tasks = await eventually(
      async () => (await board(team)).tasks,
      (found) => found.length === 1,
    );
    expect(tasks[0]).toMatchObject({ title: "Slow one" });
  });

  it("is not started without a model, and says why", async () => {
    const setup = await workspace("no-model");
    const made = await tryLaunch(setup);
    expect(made).toEqual({ _tag: "Failed", message: expect.stringContaining("No model is connected") });
    const wrong = await setup.owner.send("POST", `${setup.path}/models`, {
      source: "endpoint",
      label: "Bad",
      baseUrl: FAKE_ENDPOINT,
      key: "nope",
    });
    expect(wrong.status).toBe(201);
    const second = await tryLaunch(setup);
    expect(second).toEqual({ _tag: "Failed", message: expect.stringContaining("Incorrect API key provided.") });
  });

  it("tells the person in the chat when the connection is gone", async () => {
    const setup = await workspace("gone");
    await addEndpoint(setup);
    const team = await launch(setup);
    // The workspace loses its connection after the manager started.
    await runInDurableObject(bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(setup.objectId)), (_instance, state) => {
      state.storage.sql.exec("DELETE FROM model_connection");
    });
    expect((await say(team, "hello?", "ask-1")).status).toBe(202);
    const lines = await eventually(
      () => managerLines(team),
      (found) => found.length > 0,
    );
    expect(lines[0]).toContain("I cannot answer yet. No model is connected.");
    expect(lines[0]).toContain("Settings → Keys");
  });

  it("tells the person in the chat when the provider refuses the workspace's key", async () => {
    const setup = await workspace("refused");
    await addEndpoint(setup);
    const team = await launch(setup);
    const connection = (await workspaceStub(setup).modelConnections())[0];
    // The key was changed at the provider: what the vault holds no longer opens it, though the last test call worked.
    await workspaceStub(setup).storeSecret(`model:${connection?.id ?? ""}`, "key-that-was-revoked");
    await say(team, "hello?", "ask-1");
    const lines = await eventually(
      () => managerLines(team),
      (found) => found.length > 0,
    );
    expect(lines[0]).toContain("The model did not answer (Our models)");
    expect(lines[0]).toContain("invalid credential");
    expect(lines[0]).not.toContain("key-that-was-revoked");
  });
});

import { runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { WorkspaceObject } from "~/main.ts";
import { FAKE_ENDPOINT, FAKE_KEYS } from "~/modules/models/testing.ts";
import type { ModelConnection } from "~/modules/models/types.ts";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { EnvironmentView, SaveResult } from "~/modules/sandboxes/types.ts";
import type { AuditEntry } from "~/modules/workspace/types.ts";
import { bindings, json } from "../../test/flows.ts";
import { builder } from "../../test/roles.ts";
import { member, team, type Team } from "../../test/team.ts";

const sentences = async ({ owner, workspace }: Team): Promise<readonly string[]> =>
  (await json<{ entries: readonly AuditEntry[] }>(await owner.send("GET", `${workspace}/audit`))).entries.map(({ sentence }) => sentence);
const connections = async ({ owner, workspace }: Team) =>
  (await json<{ connections: readonly ModelConnection[] }>(await owner.send("GET", `${workspace}/models`))).connections;

const objectOf = async ({ workspace }: Team): Promise<string> =>
  (
    await bindings.AUTH.prepare(`SELECT "objectId" FROM "workspace_directory" WHERE "workspaceId" = ?`)
      .bind(workspace.split("/").at(-1))
      .first<{ objectId: string }>()
  )?.objectId ?? "";

/** Every value stored in the Workspace object, blobs as text: where a key must never be found. */
const stored = async (launch: Team): Promise<string> =>
  runInDurableObject(
    bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(await objectOf(launch))),
    (_instance: WorkspaceObject, state) => {
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
    },
  );

/** The names the vault holds, internal ones included: a removed connection leaves no key behind. */
const vaultNames = async (launch: Team): Promise<readonly string[]> =>
  runInDurableObject(bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(await objectOf(launch))), (_instance: WorkspaceObject, state) =>
    state.storage.sql
      .exec<{ name: string }>("SELECT name FROM vault_secret ORDER BY name")
      .toArray()
      .map(({ name }) => name),
  );

describe("keys and connections", () => {
  it("tests a key again, replaces it, edits an endpoint and removes a connection", async () => {
    const launch = await team("keyedit");
    const { owner, workspace } = launch;
    const [anthropic] = await connections(launch);
    const id = anthropic?.id ?? "";

    const checked = await json<{ _tag: string; connection: ModelConnection }>(await owner.send("POST", `${workspace}/models/${id}/check`));
    expect(checked).toMatchObject({ _tag: "Checked", connection: { check: { _tag: "Works" } } });

    const wrong = await json<{ connection: ModelConnection }>(
      await owner.send("PUT", `${workspace}/models/${id}`, { key: "sk-ant-wrong-key" }),
    );
    expect(wrong.connection.check).toMatchObject({ _tag: "Failed", error: "invalid x-api-key" });
    expect((await json<{ readiness: { _tag: string } }>(await owner.send("GET", `${workspace}/models`))).readiness._tag).toBe("NoModel");
    const right = await json<{ connection: ModelConnection }>(
      await owner.send("PUT", `${workspace}/models/${id}`, { key: FAKE_KEYS.anthropic }),
    );
    expect(right.connection.check._tag).toBe("Works");
    expect((await owner.send("PUT", `${workspace}/models/${id}`, { key: "  " })).status).toBe(400);
    expect((await owner.send("PUT", `${workspace}/models/${id}`, {})).status).toBe(400);
    expect(await stored(launch)).not.toContain(FAKE_KEYS.anthropic);
    expect(await stored(launch)).not.toContain("sk-ant-wrong-key");

    const added = await json<{ connection: ModelConnection }>(
      await owner.send("POST", `${workspace}/models`, { source: "endpoint", label: "Ours", baseUrl: FAKE_ENDPOINT, key: "endpoint-key" }),
    );
    const endpoint = added.connection.id;
    expect(
      (await owner.send("PUT", `${workspace}/models/${endpoint}`, { label: "Our vLLM", baseUrl: "http://insecure.example/v1" })).status,
    ).toBe(400);
    const edited = await json<{ _tag: string; connection: ModelConnection }>(
      await owner.send("PUT", `${workspace}/models/${endpoint}`, { label: "Our vLLM" }),
    );
    expect(edited).toMatchObject({ _tag: "Edited", connection: { label: "Our vLLM", check: { _tag: "Works" } } });
    expect((await owner.send("PUT", `${workspace}/models/${id}`, { label: "Renamed" })).status).toBe(400);

    expect((await owner.send("DELETE", `${workspace}/models/${endpoint}`)).status).toBe(400);
    expect((await owner.send("DELETE", `${workspace}/models/${endpoint}`, { confirm: "something else" })).status).toBe(400);
    expect((await owner.send("DELETE", `${workspace}/models/${endpoint}`, { confirm: endpoint })).status).toBe(200);
    expect((await connections(launch)).map(({ id: left }) => left)).toEqual([id]);
    expect((await owner.send("DELETE", `${workspace}/models/${endpoint}`, { confirm: endpoint })).status).toBe(404);
    expect(await vaultNames(launch)).toEqual([`model:${id}`]);

    const lines = await sentences(launch);
    expect(lines).toEqual(
      expect.arrayContaining([
        "Ama tested Anthropic: it works",
        "Ama replaced the Anthropic key",
        "Ama edited the endpoint Our vLLM",
        "Ama removed the Our vLLM connection and its key",
      ]),
    );
    for (const line of lines) expect(line).not.toMatch(/sk-ant|endpoint-key/u);
  });

  it("never sends a stored key to a changed address", async () => {
    const { owner, workspace } = await team("keymoved");
    const { connection } = await json<{ connection: ModelConnection }>(
      await owner.send("POST", `${workspace}/models`, { source: "endpoint", label: "Ours", baseUrl: FAKE_ENDPOINT, key: "endpoint-key" }),
    );
    const move = (body: object) => owner.send("PUT", `${workspace}/models/${connection.id}`, body);
    expect((await move({ baseUrl: "https://elsewhere.example/v1" })).status).toBe(400);
    const { connections: kept } = await json<{ connections: ModelConnection[] }>(await owner.send("GET", `${workspace}/models`));
    expect(kept.find(({ id }) => id === connection.id)?.baseUrl).toBe(FAKE_ENDPOINT);
    expect((await move({ baseUrl: "https://elsewhere.example/v1", key: "another-key" })).status).toBe(200);
  });

  it("keeps the default model from naming a connection that is gone", async () => {
    const launch = await team("keygone");
    const { owner, workspace } = launch;
    const added = await json<{ connection: ModelConnection }>(
      await owner.send("POST", `${workspace}/models`, { source: "endpoint", label: "Ours", baseUrl: FAKE_ENDPOINT, key: "endpoint-key" }),
    );
    const choice = { connectionId: added.connection.id, model: added.connection.models[0] };
    expect((await owner.send("PUT", `${workspace}/general`, { defaultModel: choice })).status).toBe(200);
    await owner.send("DELETE", `${workspace}/models/${added.connection.id}`, { confirm: added.connection.id });
    expect(
      (await json<{ general: { defaultModel: unknown } }>(await owner.send("GET", `${workspace}/general`))).general.defaultModel,
    ).toBeNull();
  });

  it("refuses anyone but an Owner, and anyone outside the workspace", async () => {
    const launch = await team("keyrefuse");
    const { workspace } = launch;
    const [anthropic] = await connections(launch);
    const id = anthropic?.id ?? "";
    const bo = await member(launch, "keyrefuse-bo@example.test", "Bo");
    const other = await team("keyrefuse-other");
    for (const as of [bo, other.owner]) {
      const expected = as === bo ? 403 : 404;
      expect((await as.send("POST", `${workspace}/models/${id}/check`)).status).toBe(expected);
      expect((await as.send("PUT", `${workspace}/models/${id}`, { key: FAKE_KEYS.anthropic })).status).toBe(expected);
      expect((await as.send("DELETE", `${workspace}/models/${id}`, { confirm: id })).status).toBe(expected);
      expect((await as.send("GET", `${workspace}/connections`)).status).toBe(expected);
    }
    expect((await connections(launch)).map(({ id: left }) => left)).toEqual([id]);
  });
});

describe("secrets and environments", () => {
  it("lists secret names without values, and deletes one only when asked to", async () => {
    const launch = await team("secretnames");
    const { owner, workspace } = launch;
    expect((await owner.send("PUT", `${workspace}/secrets/github`, { value: "ghs_value_that_must_stay" })).status).toBe(200);
    const listed = await json<{ secrets: readonly { name: string }[] }>(await owner.send("GET", `${workspace}/secrets`));
    expect(listed.secrets.map(({ name }) => name)).toEqual(["github"]);
    expect(JSON.stringify(listed)).not.toContain("ghs_value_that_must_stay");

    const bo = await member(launch, "secretnames-bo@example.test", "Bo");
    const mate = await builder(launch, "secretnames-mate@example.test", "Mate");
    expect((await bo.send("GET", `${workspace}/secrets`)).status).toBe(403);
    expect((await mate.send("GET", `${workspace}/secrets`)).status).toBe(200);
    expect((await mate.send("DELETE", `${workspace}/secrets/github`, { confirm: "github" })).status).toBe(403);
    expect((await owner.send("DELETE", `${workspace}/secrets/github`)).status).toBe(400);
    expect((await owner.send("DELETE", `${workspace}/secrets/github`, { confirm: "github" })).status).toBe(200);
    expect((await owner.send("DELETE", `${workspace}/secrets/github`, { confirm: "github" })).status).toBe(404);
    expect((await owner.send("DELETE", `${workspace}/secrets/model:anthropic`, { confirm: "model:anthropic" })).status).toBe(404);
    expect(await sentences(launch)).toContain("Ama removed the secret github");
    const other = await team("secretnames-other");
    expect((await other.owner.send("GET", `${workspace}/secrets`)).status).toBe(404);
  });

  it("starts an environment to test it, and deletes it only on confirmation", async () => {
    const launch = await team("envtest");
    const { owner, workspace } = launch;
    const TOKEN = "ghs_installation_token_for_test";
    await owner.send("PUT", `${workspace}/secrets/github`, { value: TOKEN });
    const saved = await json<SaveResult>(
      await owner.send("PUT", `${workspace}/environments`, {
        name: "Node",
        setup: "pnpm install\nexport GITHUB_TOKEN=vault:github",
        size: "2 vCPU · 4 GB",
      }),
    );
    if (saved._tag !== "Saved") throw new Error(saved._tag);
    const { id } = saved.environment;
    await owner.send("PUT", `${workspace}/agents/Worker/environment`, { environment: id });
    const status = async () =>
      (await json<{ environments: readonly EnvironmentView[] }>(await owner.send("GET", `${workspace}/environments`))).environments[0]
        ?.status;
    expect(await status()).toBe("Not started");

    const started = await json<{ _tag: string; ready: boolean }>(await owner.send("POST", `${workspace}/environments/${id}/test`));
    expect(started).toMatchObject({ _tag: "Tested", ready: true });
    expect(await status()).toBe("Ready");
    const ran = sandboxWorld.prepared.filter(({ key }) => key.startsWith(`${id}:`)).at(-1);
    expect(ran).toMatchObject({ script: "pnpm install", env: { GITHUB_TOKEN: TOKEN } });
    expect(JSON.stringify(started)).not.toContain(TOKEN);

    sandboxWorld.setup.failWith = `npm ERR! failed with ${TOKEN}`;
    try {
      const failed = await json<{ ready: boolean; output: string }>(await owner.send("POST", `${workspace}/environments/${id}/test`));
      expect(failed.ready).toBe(false);
      expect(failed.output).toContain("[secret github]");
      expect(failed.output).not.toContain(TOKEN);
    } finally {
      sandboxWorld.setup.failWith = undefined;
    }
    expect(await status()).toBe("Failed");

    const bo = await member(launch, "envtest-bo@example.test", "Bo");
    expect((await bo.send("POST", `${workspace}/environments/${id}/test`)).status).toBe(403);
    expect((await bo.send("DELETE", `${workspace}/environments/${id}`, { confirm: id })).status).toBe(403);
    const other = await team("envtest-other");
    expect((await other.owner.send("POST", `${workspace}/environments/${id}/test`)).status).toBe(404);
    expect((await other.owner.send("DELETE", `${workspace}/environments/${id}`, { confirm: id })).status).toBe(404);

    expect((await owner.send("DELETE", `${workspace}/environments/${id}`)).status).toBe(400);
    const deleted = await json<{ _tag: string; agents: readonly string[] }>(
      await owner.send("DELETE", `${workspace}/environments/${id}`, { confirm: id }),
    );
    expect(deleted).toEqual({ _tag: "Deleted", agents: ["Worker"] });
    expect(await status()).toBeUndefined();
    expect((await owner.send("POST", `${workspace}/environments/${id}/test`)).status).toBe(404);
    expect(await sentences(launch)).toEqual(
      expect.arrayContaining([
        "Ama deleted the environment Node; Worker now run in the plain container",
        "Ama test-started the environment Node: it came up",
      ]),
    );
  });
});

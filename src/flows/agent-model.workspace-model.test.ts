import { describe, expect, it } from "vitest";
import { FAKE_ENDPOINT, FAKE_KEYS, modelCallsSeen } from "~/modules/models/testing.ts";
import type { ModelConnection } from "~/modules/models/types.ts";
import type { CreateManagerResult, WorkspaceApi } from "~/modules/workspace/types.ts";
import type { CreateWorkspaceResult } from "~/modules/workspaces/types.ts";
import { type Browser, bindings, eventually, json, signUp } from "../../test/flows.ts";
import { press } from "../../test/settings.ts";
import { chatLog, runOf, say, type Team } from "../../test/team.ts";

/*
 * The model a saved agent or the workspace chose, through the real path: the agent's run, the workspace's route and the
 * endpoint that answers. Two models are on the endpoint, `scripted-mini` (its first, which nobody chose) and `scripted-large`.
 */

interface Setup {
  readonly owner: Browser;
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
  return { owner, path: `/api/workspaces/${workspaceId}`, objectId: row?.objectId ?? "" };
}

async function endpoint({ owner, path }: Setup): Promise<ModelConnection> {
  const made = await json<{ connection: ModelConnection }>(
    await owner.send("POST", `${path}/models`, { source: "endpoint", label: "Our models", baseUrl: FAKE_ENDPOINT, key: "endpoint-key" }),
  );
  return made.connection;
}

async function launch({ owner, path }: Setup): Promise<Team> {
  const made = await json<CreateManagerResult>(await owner.send("POST", `${path}/managers`, { name: "Launch", template: "kanban" }));
  if (made._tag !== "Created") throw new Error(JSON.stringify(made));
  return { owner, workspace: path, base: `${path}/managers/${made.manager.managerId}`, manager: made.manager };
}

const stub = ({ objectId }: Setup): WorkspaceApi =>
  bindings.WORKSPACE.get(bindings.WORKSPACE.idFromString(objectId)) as unknown as WorkspaceApi;
const modelsSince = (start: number): readonly string[] => modelCallsSeen.slice(start).map(({ model }) => model);

describe("the model a run and a manager think with", () => {
  it("asks the endpoint for the model a saved agent chose, and for the workspace's default when the manager answers", async () => {
    const setup = await workspace("agent-model");
    const connection = await endpoint(setup);
    const team = await launch(setup);
    const { owner, path } = setup;

    await owner.send("POST", `${path}/agents`, {
      config: {
        name: "Big thinker",
        instructions: "Think hard.",
        thinking: "high",
        tools: ["read"],
        skills: [],
        model: { connectionId: connection.id, model: "scripted-large" },
      },
    });
    await press(team, "task.create", { title: "Plan it" });
    const start = modelCallsSeen.length;
    await press(team, "run.start", { task: "DT-1", role: "planner", agent: "Big thinker" });
    await eventually(
      () => runOf(team, "run-1"),
      ({ lines }) => lines.some(({ role }) => role === "manager"),
      20_000,
    );
    expect(modelsSince(start)).toContain("scripted-large");
    expect((await runOf(team, "run-1")).run).toMatchObject({ agent: "Big thinker", agentVersion: 1, model: { model: "scripted-large" } });

    // The manager itself has no choice of its own, so until the workspace names a default it is the endpoint's first model.
    const before = modelCallsSeen.length;
    await say(team, "hello", "hello-1");
    await eventually(
      () => chatLog(team),
      (lines) => lines.some(({ text }) => text.startsWith("Hello, I am scripted-mini")),
    );
    expect(modelsSince(before)).not.toContain("scripted-large");
    expect(
      (await owner.send("PUT", `${path}/general`, { defaultModel: { connectionId: connection.id, model: "scripted-large" } })).status,
    ).toBe(200);
    await say(team, "hello again", "hello-2");
    await eventually(
      () => chatLog(team),
      (lines) => lines.some(({ text }) => text.startsWith("Hello, I am scripted-large")),
    );
  });

  it("says which choice could not be used, and what answered, when its connection stopped working", async () => {
    const setup = await workspace("model-fallback");
    const connection = await endpoint(setup);
    await setup.owner.send("POST", `${setup.path}/models`, { source: "anthropic", key: FAKE_KEYS.anthropic });
    expect(
      (await setup.owner.send("PUT", `${setup.path}/general`, { defaultModel: { connectionId: connection.id, model: "scripted-large" } }))
        .status,
    ).toBe(200);
    expect(await stub(setup).modelRoute()).toMatchObject({ connectionId: connection.id, model: "scripted-large" });

    await setup.owner.send("PUT", `${setup.path}/models/${connection.id}`, { key: "not-the-key" });
    const route = await stub(setup).modelRoute();
    expect(route).toMatchObject({ _tag: "Route", source: "anthropic" });
    expect(route._tag === "Route" && route.notice).toContain(
      "The workspace's default model scripted-large cannot be used (Our models is not working",
    );
    expect(route._tag === "Route" && route.notice).toContain("answered instead");
  });
});

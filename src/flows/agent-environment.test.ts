import { describe, expect, it } from "vitest";
import type { ModelConnection } from "~/modules/models/types.ts";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { EnvironmentView, SaveResult } from "~/modules/sandboxes/types.ts";
import type { AgentView } from "~/modules/settings/types.ts";
import type { AuditEntry } from "~/modules/workspace/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { press } from "../../test/settings.ts";
import { runOf, team, type Team } from "../../test/team.ts";

const environment = async ({ owner, workspace }: Team, name: string): Promise<string> => {
  const made = await json<SaveResult>(await owner.send("PUT", `${workspace}/environments`, { name, setup: "", size: "2 vCPU · 4 GB" }));
  if (made._tag !== "Saved") throw new Error(made._tag);
  return made.environment.id;
};
const agent = async ({ owner, workspace }: Team, config: object): Promise<AgentView> =>
  (await json<{ value: AgentView }>(await owner.send("POST", `${workspace}/agents`, { config }))).value;
const agents = async ({ owner, workspace }: Team): Promise<readonly AgentView[]> =>
  (await json<{ agents: readonly AgentView[] }>(await owner.send("GET", `${workspace}/agents`))).agents;
const usedBy = async ({ owner, workspace }: Team): Promise<readonly (readonly [string, readonly string[]])[]> =>
  (await json<{ environments: readonly EnvironmentView[] }>(await owner.send("GET", `${workspace}/environments`))).environments.map(
    (one) => [one.name, one.usedBy] as const,
  );
const assign = async ({ owner, workspace }: Team, name: string, id: string | null): Promise<number> =>
  (await owner.send("PUT", `${workspace}/agents/${name}/environment`, { environment: id })).status;
const sentences = async ({ owner, workspace }: Team): Promise<readonly string[]> =>
  (await json<{ entries: readonly AuditEntry[] }>(await owner.send("GET", `${workspace}/audit`))).entries.map(({ sentence }) => sentence);

describe("where a saved agent runs", () => {
  it("runs its commands in the plain container when it has no environment", async () => {
    const launch = await team("plainbox");
    await agent(launch, { name: "Docs writer", tools: ["bash"] });
    sandboxWorld.script("plain-ls", { stdout: "nothing here yet" });
    await press(launch, "task.create", { title: "Look around" });
    await press(launch, "run.start", { task: "DT-1", role: "tester", agent: "Docs writer", brief: "run: plain-ls" });
    const { run } = await eventually(
      () => runOf(launch, "run-1"),
      ({ run: found }) => found?.state === "ended",
      20_000,
    );
    expect(run).toMatchObject({ report: "ready", note: expect.stringContaining("Exit 0 in the plain container.") });
    expect(run.note).toContain("nothing here yet");
  });

  it("moves an agent whose name has a space or other letters, as a new version with who did it", async () => {
    const launch = await team("movebox");
    const node = await environment(launch, "Node");
    await agent(launch, { name: "Docs writer" });
    await agent(launch, { name: "Rédaction 2/3" });
    expect(await assign(launch, "Docs%20writer", node)).toBe(200);
    expect(await assign(launch, encodeURIComponent("Rédaction 2/3"), node)).toBe(200);
    expect((await agents(launch)).map(({ config, version }) => [config.name, version, config.environment])).toEqual([
      ["Docs writer", 2, node],
      ["Rédaction 2/3", 2, node],
    ]);
    expect(await usedBy(launch)).toEqual([["Node", ["Docs writer", "Rédaction 2/3"]]]);
    expect(await sentences(launch)).toEqual(expect.arrayContaining(["Ama saved Docs writer as version 2"]));
    expect((await agents(launch))[0]?.versions[0]?.note).toBe("Runs in Node");
    // Where it already is: nothing to save.
    expect(await assign(launch, "Docs%20writer", node)).toBe(200);
    expect((await agents(launch))[0]?.version).toBe(2);
    expect(await assign(launch, "Docs%20writer", null)).toBe(200);
    expect((await agents(launch))[0]).toMatchObject({ version: 3, config: { environment: null } });
    expect(await assign(launch, "%E0%A4%A", node)).toBe(400);
  });

  it("moves no agent that does not exist, and the plain Worker, which nobody saves", async () => {
    const launch = await team("nobody-box");
    const node = await environment(launch, "Node");
    expect(await assign(launch, "Nobody", node)).toBe(404);
    expect(await assign(launch, "Worker", "env_404")).toBe(404);
    expect(await usedBy(launch)).toEqual([["Node", []]]);
    expect(await assign(launch, "Worker", node)).toBe(200);
    expect(await usedBy(launch)).toEqual([["Node", ["Worker"]]]);
    expect(await sentences(launch)).toEqual(expect.arrayContaining(["Ama set the environment of Worker"]));
    // Saved now, so where it runs is its own, and it was saved with none.
    await agent(launch, { name: "Worker" });
    expect(await usedBy(launch)).toEqual([["Node", []]]);
  });

  it("puts its agents in the plain container when an environment is deleted, and names them", async () => {
    const launch = await team("gonebox");
    const { owner, workspace } = launch;
    const node = await environment(launch, "Node");
    const saved = await agent(launch, { name: "Docs writer", environment: node });
    const deleted = await json(await owner.send("DELETE", `${workspace}/environments/${node}`, { confirm: node }));
    expect(deleted).toEqual({ _tag: "Deleted", agents: ["Docs writer"] });
    expect((await agents(launch))[0]).toMatchObject({ version: 1, config: { environment: null } });
    expect(await sentences(launch)).toEqual(
      expect.arrayContaining(["Ama deleted the environment Node; Docs writer now run in the plain container"]),
    );
    const again = await owner.send("PUT", `${workspace}/agents/${saved.id}`, { config: { ...saved.config, instructions: "More." } });
    expect([again.status, await json(again)]).toEqual([400, { _tag: "Invalid", reason: "There is no such environment" }]);
  });

  it("says why it cannot move an agent whose model is gone, and leaves it where it was", async () => {
    const launch = await team("stalebox");
    const { owner, workspace } = launch;
    const node = await environment(launch, "Node");
    const { connections } = await json<{ connections: readonly ModelConnection[] }>(await owner.send("GET", `${workspace}/models`));
    const [connection] = connections;
    if (connection === undefined) throw new Error("no connection");
    await agent(launch, { name: "Docs writer", model: { connectionId: connection.id, model: connection.models[0] } });
    await owner.send("DELETE", `${workspace}/models/${connection.id}`, { confirm: connection.id });
    const moved = await owner.send("PUT", `${workspace}/agents/Docs%20writer/environment`, { environment: node });
    expect([moved.status, await json(moved)]).toEqual([400, { _tag: "Invalid", reason: expect.stringContaining("connection") }]);
    expect((await agents(launch))[0]).toMatchObject({ version: 1, config: { environment: null } });
  });
});

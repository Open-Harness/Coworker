import { describe, expect, it } from "vitest";
import { offered, runsSeen } from "~/modules/manager/testing.ts";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { SaveResult } from "~/modules/sandboxes/types.ts";
import type { AgentView, SkillView } from "~/modules/settings/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { press, saidBy } from "../../test/settings.ts";
import { board, chatLog, inbox, runOf, say, team, type Team } from "../../test/team.ts";

const SKILL = {
  "SKILL.md": "---\nname: release-notes\ndescription: Write release notes in our house style.\n---\nUse template.md.",
  "template.md": "## What changed\n- one line per change",
};

/** A workspace with a skill and an agent that uses it, and a task for it to work on. */
async function withAgent(address: string, extra: { tools?: string[] } = {}) {
  const launch = await team(address);
  const { owner, workspace } = launch;
  const skill = await json<{ value: SkillView }>(await owner.send("POST", `${workspace}/skills`, { name: "release-notes", files: SKILL }));
  const config = {
    name: "Docs writer",
    instructions: "You write release notes. Keep them short.",
    thinking: "high",
    tools: extra.tools ?? ["read", "bash"],
    skills: ["release-notes"],
    model: null,
  };
  const agent = await json<{ value: AgentView }>(await owner.send("POST", `${workspace}/agents`, { config }));
  await press(launch, "task.create", { title: "Write the notes" });
  return { launch, config, skill: skill.value, agent: agent.value };
}

const start = (launch: Team, input: object) => press(launch, "run.start", { task: "DT-1", role: "writer", ...input });
const finished = (launch: Team, run: string) =>
  eventually(
    () => runOf(launch, run),
    ({ run: found }) => found?.state === "ended",
    20_000,
  );

describe("a saved agent applied to a run", () => {
  it("gives the run the agent's instructions, its tools and its skills' files, and shows the version it took", async () => {
    const { launch } = await withAgent("apply-agent", { tools: ["read"] });
    const before = runsSeen.length;
    expect((await start(launch, { agent: "Docs writer", brief: "read skill: release-notes template.md" })).value?.ok).toBe(true);
    const { run } = await finished(launch, "run-1");
    expect(run).toMatchObject({ agent: "Docs writer", agentVersion: 1, report: "ready" });
    expect(run.note).toContain("one line per change");

    const seen = runsSeen.slice(before).find(({ role }) => role === "writer");
    expect(seen?.system).toContain("You write release notes. Keep them short.");
    expect(seen?.system).toContain("release-notes: Write release notes in our house style.");
    // Only the tools of the agent's list: no commands without bash, but its files and skills can be read.
    expect(seen?.tools).toEqual(expect.arrayContaining(["report", "read_file", "read_skill"]));
    expect(seen?.tools).not.toContain("run_command");
  });

  it("answers a skill path that is not there with the paths that are, and gives a run with no agent every tool but the skills'", async () => {
    const { launch } = await withAgent("apply-plain");
    await start(launch, { agent: "Docs writer", brief: "read skill: release-notes nothing.md" });
    const { run } = await finished(launch, "run-1");
    expect(run).toMatchObject({ report: "failed", note: expect.stringContaining("has no nothing.md. Its files: SKILL.md, template.md") });
    const before = runsSeen.length;
    await start(launch, { brief: "no agent named" });
    await finished(launch, "run-2");
    const plain = runsSeen.slice(before).find(({ role }) => role === "writer");
    expect(plain?.tools).toEqual(expect.arrayContaining(["report", "read_file", "run_command"]));
    expect(plain?.tools).not.toContain("read_skill");
    expect((await runOf(launch, "run-2")).run.agentVersion).toBeUndefined();
  });

  it("changes only later runs when the agent is edited, and leaves a running run alone when it is deleted", async () => {
    const { launch, config, agent } = await withAgent("apply-edit");
    const { owner, workspace } = launch;
    await start(launch, { agent: "Docs writer", brief: "slowly" });
    await eventually(
      () => runOf(launch, "run-1").catch(() => undefined),
      (found) => found?.run?.report === "progress",
    );
    await owner.send("PUT", `${workspace}/agents/${agent.id}`, { config: { ...config, instructions: "Write long notes." } });
    expect((await start(launch, { agent: "Docs writer" })).value?.ok).toBe(true);
    expect((await owner.send("DELETE", `${workspace}/agents/${agent.id}`, { confirm: agent.id })).status).toBeLessThan(300);

    const first = await finished(launch, "run-1");
    expect(first.run).toMatchObject({ agentVersion: 1, report: "ready", note: "Done slowly" });
    expect((await runOf(launch, "run-2")).run).toMatchObject({ agentVersion: 2, agent: "Docs writer" });

    const later = await start(launch, { agent: "Docs writer" });
    expect(later.value).toMatchObject({ ok: false, message: expect.stringContaining("The agent Docs writer is gone") });
    expect((await board(launch)).tasks[0]?.runs).toEqual(["run-1", "run-2"]);
  });

  it("runs commands in the environment the run took, and lists the saved agents in the manager's prompt", async () => {
    const launch = await team("apply-env");
    const { owner, workspace } = launch;
    const made = await json<SaveResult>(
      await owner.send("PUT", `${workspace}/environments`, { name: "Node", setup: "pnpm i", size: "2 vCPU · 4 GB" }),
    );
    if (made._tag !== "Saved") throw new Error(made._tag);
    const config = { name: "Tester", instructions: "Run the tests.", thinking: "low", tools: ["bash"], skills: [], model: null };
    await owner.send("POST", `${workspace}/agents`, { config: { ...config, environment: made.environment.id } });
    await press(launch, "task.create", { title: "Test it" });
    sandboxWorld.script("pnpm test", { stdout: "all passed" });
    await start(launch, { agent: "Tester", role: "tester", brief: "run: pnpm test" });
    const { run } = await finished(launch, "run-1");
    expect(run).toMatchObject({ agent: "Tester", report: "ready", note: expect.stringContaining("Exit 0 in Node.") });
    expect(run.note).toContain("all passed");
    expect(sandboxWorld.ran).toContainEqual({ image: `image:${made.environment.id}:1`, command: "pnpm test", env: {} });

    await say(launch, "Hello", "hello-1");
    await eventually(
      () => chatLog(launch),
      (all) => all.some(({ role }) => role === "manager"),
    );
    expect(offered.system).toContain("Tester (version 1): Run the tests. [tools: bash]");
  });
});

describe("a task a person settled", () => {
  it("wears no waiting stage once a person moves it to the last lane, and again if a run reports after", async () => {
    const launch = await team("settled");
    await press(launch, "task.create", { title: "Write the post" });
    await start(launch, { brief: "" });
    await finished(launch, "run-1");
    const stageOf = async () => (await board(launch)).tasks[0];
    expect(await stageOf()).toMatchObject({ stage: "person.review", settled: false });

    await press(launch, "task.move", { task: "DT-1", lane: "done" });
    expect(await stageOf()).toMatchObject({ stage: "idle", stageLabel: "", settled: true });

    await press(launch, "task.move", { task: "DT-1", lane: "doing" });
    expect(await stageOf()).toMatchObject({ stage: "person.review", settled: false });

    // Moved there by the manager, it was not a person's call: the review still waits.
    await say(launch, "move DT-1 to done", "move-1");
    await eventually(stageOf, (task) => task?.lane === "done");
    expect(await stageOf()).toMatchObject({ stage: "person.review", settled: false });
  });
});

describe("a question the manager asks", () => {
  it("shows in the chat log with its words and the Inbox item it waits in", async () => {
    const launch = await team("chat-question");
    await say(launch, "ask me: Which day do we ship?", "ask-1");
    const [item] = await eventually(
      () => inbox(launch.owner, launch),
      (items) => items.length === 1,
    );
    const line = (await chatLog(launch)).find(({ question }) => question !== undefined);
    expect(line).toMatchObject({ role: "manager", text: "Which day do we ship?", question: { itemId: item?.id } });
    expect(item?.title).toBe("Which day do we ship?");
  });
});

describe("a manager changing its own permissions", () => {
  it("says who allowed it", async () => {
    const launch = await team("self-allowed");
    await say(launch, "change my permissions: task.delete on", "perm-1");
    const [item] = await eventually(
      () => inbox(launch.owner, launch),
      (items) => items.length === 1,
    );
    await launch.owner.send("POST", `${launch.workspace}/inbox/${encodeURIComponent(item?.id ?? "")}`, { choice: "Allow once" });
    await eventually(
      () => saidBy(launch, "&category=itself"),
      (sentences) => sentences.some((sentence) => sentence.includes("changed its own Permissions")),
    );
    expect(await saidBy(launch, "&category=itself")).toContain("Launch changed its own Permissions, allowed by Ama");
  });
});

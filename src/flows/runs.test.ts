import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { bindings, eventually } from "../../test/flows.ts";
import { board, chatLog, runOf, say, team } from "../../test/team.ts";

const stageOf = async (launch: Awaited<ReturnType<typeof team>>, task: string) =>
  (await board(launch)).tasks.find(({ id }) => id === task)?.stage;

describe("runs", () => {
  it("flw:manager/run", async () => {
    const launch = await team("runs");
    await say(launch, "add a task: Write the launch post", "task-1");
    await eventually(
      () => board(launch),
      ({ tasks }) => tasks.length === 1,
    );
    expect(await stageOf(launch, "DT-1")).toBe("queued");
    await say(launch, "start a writer on DT-1", "run-1");
    expect(
      await eventually(
        () => stageOf(launch, "DT-1"),
        (stage) => stage === "person.review",
      ),
    ).toBe("person.review");
    const { run, lines } = await eventually(
      () => runOf(launch, "run-1"),
      (found) => found.lines.at(-1)?.text === "Finished.",
    );
    expect(run).toMatchObject({
      task: "DT-1",
      role: "writer",
      agent: "Worker",
      state: "ended",
      report: "ready",
      startedBy: { kind: "manager" },
    });
    expect(lines[0]).toMatchObject({
      role: "person",
      text: expect.stringContaining("You are working as writer on DT-1: Write the launch post."),
    });
    expect(lines.some(({ role, text }) => role === "action" && text === "report: Reported ready.")).toBe(true);
    expect(lines.at(-1)).toMatchObject({ role: "manager", text: "Finished." });

    await say(launch, "add a task: Fix the build", "task-2");
    await eventually(
      () => board(launch),
      ({ tasks }) => tasks.length === 2,
    );
    await say(launch, "start a fixer on DT-2 you will be blocked", "run-2");
    expect(
      await eventually(
        () => stageOf(launch, "DT-2"),
        (stage) => stage === "person.blocked",
      ),
    ).toBe("person.blocked");
    expect((await board(launch)).tasks.map(({ runs }) => runs)).toEqual([["run-1"], ["run-2"]]);
  });

  it("flw:manager/restart", async () => {
    const launch = await team("restart");
    await say(launch, "add a task: Write the launch post", "task-1");
    await eventually(
      () => board(launch),
      ({ tasks }) => tasks.length === 1,
    );
    await say(launch, "start a writer on DT-1 slowly", "run-1");
    const started = await eventually(
      () => runOf(launch, "run-1").catch(() => undefined),
      (found) => found?.run?.report === "progress",
    );
    expect(started?.run.report).toBe("progress");
    const stub = bindings.MANAGER.get(bindings.MANAGER.idFromString(launch.manager.objectId));
    // An abort does not wait for the run: this is the process dying mid-answer.
    await runInDurableObject(stub, (_instance, state) => state.abort("killed")).catch(() => undefined);
    expect(await runDurableObjectAlarm(bindings.MANAGER.get(bindings.MANAGER.idFromString(launch.manager.objectId)))).toBe(true);
    const finished = await eventually(
      () => runOf(launch, "run-1"),
      ({ run }) => run.state === "ended",
      20_000,
    );
    expect(finished.run).toMatchObject({ state: "ended", report: "ready", note: "Done slowly" });
    const reports = finished.lines.filter(({ role, text }) => role === "action" && text.startsWith("report:"));
    expect(reports.map(({ text }) => text)).toEqual(["report: Reported progress.", "report: Reported ready."]);
    const view = await board(launch);
    expect(view.tasks.map(({ id, runs }) => ({ id, runs }))).toEqual([{ id: "DT-1", runs: ["run-1"] }]);
    const starts = (await chatLog(launch)).filter(({ role, text }) => role === "action" && text.startsWith("run_start:"));
    expect(starts).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { eventually, json } from "../../test/flows.ts";
import { audit, board, chatLog, member, runOf, say, team } from "../../test/team.ts";

/** A task with a run that writes for minutes, until someone stops it. */
async function goingRun(address: string, name: string) {
  const launch = await team(address);
  await say(launch, "add a task: Write the launch post", "task-1");
  await eventually(
    () => board(launch),
    ({ tasks }) => tasks.length === 1,
  );
  await say(launch, `start a ${name} on DT-1 keeps going`, "run-1");
  await eventually(
    () => runOf(launch, "run-1").catch(() => undefined),
    (found) => found?.run?.report === "progress",
  );
  return launch;
}

const writing = async (launch: Awaited<ReturnType<typeof team>>) => (await runOf(launch, "run-1")).lines;

describe("stopping a run", () => {
  it("a person's button ends the run for good, says so, and pressing it again changes nothing", async () => {
    const launch = await goingRun("stoprun", "writer");
    expect((await runOf(launch, "run-1")).run.state).toBe("running");

    const pressed = await launch.owner.send("POST", `${launch.base}/actions/run.stop`, { input: { run: "run-1" }, requestId: "stop-1" });
    expect(pressed.status).toBe(200);
    const stopped = (await runOf(launch, "run-1")).run;
    expect(stopped).toMatchObject({ state: "ended", report: "dropped", note: "Stopped by Ama", stopped: { by: { name: "Ama" } } });

    // The agent is not still writing: its words stop, and it never reports again.
    const lines = await writing(launch);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await writing(launch)).toEqual(lines);
    expect(lines.some(({ text }) => text.startsWith("report: Reported ready"))).toBe(false);
    expect((await board(launch)).tasks[0]?.stage).not.toBe("person.review");

    const again = await launch.owner.send("POST", `${launch.base}/actions/run.stop`, { input: { run: "run-1" }, requestId: "stop-2" });
    expect(again.status).toBe(200);
    expect((await json<{ value: { value: { stopped: boolean } } }>(again)).value.value.stopped).toBe(false);
    expect((await runOf(launch, "run-1")).run).toEqual(stopped);

    const unknown = await launch.owner.send("POST", `${launch.base}/actions/run.stop`, { input: { run: "run-9" }, requestId: "stop-3" });
    expect((await json<{ value: { ok: boolean; message: string } }>(unknown)).value).toEqual({
      ok: false,
      message: "There is no run run-9",
    });

    // Each press is a line of the audit log, in the action's own sentence.
    const sentences = (
      await eventually(
        () => audit(launch),
        (entries) => entries.some(({ sentence }) => sentence.includes("stopped run")),
      )
    )
      .map(({ sentence }) => sentence)
      .filter((sentence) => sentence.includes("stopped run"));
    expect(sentences).toContain("Ama stopped run run-1");
  });

  it("the manager's own tool stops a run the same way", async () => {
    const launch = await goingRun("stopbymanager", "tester");
    await say(launch, "stop run-1", "stop-it");
    const ended = await eventually(
      () => runOf(launch, "run-1"),
      ({ run }) => run.state === "ended",
    );
    expect(ended.run).toMatchObject({ state: "ended", report: "dropped", note: "Stopped by Launch" });
    const log = await eventually(
      () => chatLog(launch),
      (lines) => lines.some(({ role, text }) => role === "action" && text.startsWith("run_stop:")),
    );
    expect(log.some(({ role, text }) => role === "action" && text.startsWith("run_stop:"))).toBe(true);
    const lines = await writing(launch);
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(await writing(launch)).toEqual(lines);
  });

  it("a Member may stop a run too", async () => {
    const launch = await goingRun("stopmember", "fixer");
    const chidi = await member(launch, "chidi.stop@example.test", "Chidi");
    const pressed = await chidi.send("POST", `${launch.base}/actions/run.stop`, { input: { run: "run-1" }, requestId: "m-1" });
    expect(pressed.status).toBe(200);
    expect((await runOf(launch, "run-1")).run).toMatchObject({ state: "ended", note: "Stopped by Chidi" });
  });
});

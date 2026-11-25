import { expect, type Page, test } from "@playwright/test";
import { shot } from "./shots.ts";
import { hasTask, say, signedIn, team, type Team } from "./team.ts";

/*
 * From a task, a person opens an agent run, reads its steps and its report, and stops one that is still going.
 * "keeps going" in a brief makes the scripted agent write for minutes, so there is a run to stop.
 */

type RunBody = {
  run: { state: string; report?: string; note?: string; stopped?: { by: { name: string } } };
  lines: { id: string; text: string }[];
};

const runOf = async ({ page, api }: Team, run: string): Promise<RunBody> =>
  (await (await page.request.get(`${api}/runs/${run}`)).json()) as RunBody;

const stateOf = async (launch: Team, run: string): Promise<string | undefined> => (await runOf(launch, run)).run?.state;

const stopRun = (launch: Team, run: string, requestId: string) =>
  launch.page.request.post(`${launch.api}/actions/run.stop`, {
    data: { input: { run }, requestId },
    headers: { origin: new URL(launch.page.url()).origin },
  });

/** From the task page, one click to the run. */
async function openRun(page: Page, launch: Team, run: string, title: RegExp): Promise<void> {
  await page.goto(`/ws/${launch.workspaceId}/m/${launch.managerId}/tasks/DT-1`);
  await expect(page.getByRole("heading", { name: "Agents on this task" })).toBeVisible();
  await page.getByRole("link", { name: title }).click();
  await expect(page).toHaveURL(new RegExp(`/runs/${run}$`, "u"));
}

test("ui:run/transcript", async ({ browser }) => {
  const launch = await team(await signedIn(browser, "runs@example.test", "Ama Mensah"), "runsteam");
  const { page } = launch;
  await say(launch, "add a task: Draft the release notes", "task-1");
  await hasTask(launch, "Draft the release notes");
  await say(launch, "start a writer on DT-1 write the first draft", "run-1");
  await expect.poll(() => stateOf(launch, "run-1")).toBe("ended");

  // A run that finished: its steps, its report, and nothing to stop.
  await openRun(page, launch, "run-1", /^writer · attempt 1/u);
  await expect(page.getByRole("heading", { level: 1, name: "writer on DT-1" })).toBeVisible();
  await expect(page.getByText("Ended", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Report" })).toBeVisible();
  await expect(page.getByText("Ready for review")).toBeVisible();
  await expect(page.getByText("Reported ready", { exact: true })).toBeVisible();
  await expect(page.getByText("You are working as writer on DT-1: Draft the release notes.")).toBeVisible();
  await expect(page.getByText("Drafted it.")).toBeVisible();
  await expect(page.getByText("report: Reported ready.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop run" })).toHaveCount(0);
  await shot(page, "run-transcript", "both");

  // A run that is still going: it shows what it has done and written so far, and it can be stopped.
  await say(launch, "start a tester on DT-1 keeps going", "run-2");
  await openRun(page, launch, "run-2", /^tester · attempt 1/u);
  await expect(page.getByText("Running", { exact: true })).toBeVisible();
  await expect(page.getByText("report: Reported progress.")).toBeVisible();
  await expect(page.getByText("Writing…")).toBeVisible();
  await expect(page.getByText(/Step after step\./u).first()).toBeVisible();
  await shot(page, "run-transcript-running", "both");
  await page.getByRole("button", { name: "Stop run" }).click();
  await expect(page.getByText("Stopped", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Stopped by Ama Mensah. It does nothing more.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop run" })).toHaveCount(0);
  await expect(page.getByText("Writing…")).toBeHidden();
  await shot(page, "run-transcript-stopped", "both");

  // It really stopped: nothing more is written, and what it would say later changes nothing.
  const stopped = await runOf(launch, "run-2");
  expect(stopped.run).toMatchObject({ state: "ended", report: "dropped", note: "Stopped by Ama Mensah" });
  await page.waitForTimeout(2_000);
  expect((await runOf(launch, "run-2")).lines).toEqual(stopped.lines);

  // Stopping again, or stopping one that already ended, is harmless.
  for (const [run, requestId] of [
    ["run-2", "again-1"],
    ["run-2", "again-2"],
    ["run-1", "ended-1"],
  ] as const) {
    const again = await stopRun(launch, run, requestId);
    expect(again.status(), `stopping ${run} again`).toBe(200);
  }
  const afterwards = await runOf(launch, "run-2");
  expect(afterwards.run).toMatchObject({ state: "ended", report: "dropped", note: "Stopped by Ama Mensah" });
  expect((await runOf(launch, "run-1")).run).toMatchObject({ state: "ended", report: "ready" });
  await page.reload();
  await expect(page.getByText("Stopped by Ama Mensah. It does nothing more.")).toBeVisible();
});

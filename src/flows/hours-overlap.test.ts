import { describe, expect, it } from "vitest";
import { billingWorld } from "~/modules/billing/testing.ts";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { SaveResult } from "~/modules/sandboxes/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { board, runOf, say, team } from "../../test/team.ts";

const HOUR = 3_600;

describe("sandbox hours of commands that overlap", () => {
  it("are each charged once", async () => {
    const launch = await team("overlap");
    const { owner, workspace } = launch;
    const saved = await json<SaveResult>(await owner.send("PUT", `${workspace}/environments`, { name: "jobs", setup: "true" }));
    if (saved._tag !== "Saved") throw new Error(saved._tag);
    await owner.send("PUT", `${workspace}/agents/Worker/environment`, { environment: saved.environment.id });
    sandboxWorld.setup.seconds = 0;
    // Neither command ends before both are running: 12 hours each, with 10 in the plan.
    let running = 0;
    sandboxWorld.script("work 12h", async () => {
      running += 1;
      while (running < 2) await scheduler.wait(20);
      return { seconds: 12 * HOUR };
    });
    for (const n of [1, 2]) {
      await say(launch, `add a task: Job ${n}`, `task-${n}`);
      await eventually(
        () => board(launch),
        ({ tasks }) => tasks.length === n,
      );
      await say(launch, `start a worker on DT-${n} run: work 12h`, `run-${n}`);
    }
    for (const n of [1, 2])
      await eventually(
        () => runOf(launch, `run-${n}`),
        ({ run }) => run?.state === "ended",
        20_000,
      );
    expect(billingWorld.hoursOf(workspace.split("/").at(-1) ?? "")).toBe(14);
  }, 60_000);
});

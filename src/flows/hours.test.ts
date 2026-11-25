import { describe, expect, it } from "vitest";
import { billingWorld } from "~/modules/billing/testing.ts";
import type { BillingView } from "~/modules/billing/types.ts";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { SaveResult } from "~/modules/sandboxes/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { board, runOf, say, team, type Team } from "../../test/team.ts";

const HOUR = 3_600;
const billing = async ({ owner, workspace }: Team): Promise<BillingView> =>
  (await json<{ billing: BillingView }>(await owner.send("GET", `${workspace}/billing`))).billing;

/** A task, and a run on it that runs `command`, waited for until it reports. */
async function runOn(launch: Team, command: string, n: number) {
  await say(launch, `add a task: Job ${n}`, `task-${n}`);
  await eventually(
    () => board(launch),
    ({ tasks }) => tasks.length === n,
  );
  await say(launch, `start a worker on DT-${n} run: ${command}`, `run-${n}`);
  return (
    await eventually(
      () => runOf(launch, `run-${n}`),
      ({ run }) => run?.state === "ended",
      20_000,
    )
  ).run;
}

describe("sandbox hours", () => {
  it("flw:sandbox/hours", async () => {
    const launch = await team("hours");
    const { owner, workspace } = launch;
    const workspaceId = workspace.split("/").at(-1) ?? "";
    const saved = await json<SaveResult>(await owner.send("PUT", `${workspace}/environments`, { name: "jobs", setup: "true" }));
    if (saved._tag !== "Saved") throw new Error(saved._tag);
    await owner.send("PUT", `${workspace}/agents/Worker/environment`, { environment: saved.environment.id });
    sandboxWorld.setup.seconds = 0;
    sandboxWorld.script("work 9h", { seconds: 9 * HOUR });
    sandboxWorld.script("work 64h", { seconds: 64 * HOUR });
    sandboxWorld.script("work 1h", { seconds: HOUR });

    // Inside what the seat includes: nothing is charged.
    expect(await runOn(launch, "work 9h", 1)).toMatchObject({ report: "ready" });
    expect(await billing(launch)).toMatchObject({
      plan: { name: "Team", seatCents: 2_000, includedHoursPerSeat: 10, overageCentsPerHour: 80 },
      hours: { used: 9, included: 10, over: 0 },
      overageCents: 0,
      limit: { on: true, overCents: 5_000 },
      stopped: false,
    });
    expect(billingWorld.hoursOf(workspaceId)).toBe(0);

    // Past it, each hour is $0.80; at $50 over plan, sandboxes stop.
    await runOn(launch, "work 64h", 2);
    expect(await billing(launch)).toMatchObject({ hours: { used: 73, over: 63 }, overageCents: 5_040, stopped: true });
    expect(billingWorld.hoursOf(workspaceId)).toBe(63);
    const refused = await runOn(launch, "work 1h", 3);
    expect(refused).toMatchObject({ report: "failed", note: expect.stringContaining("$50 over plan") });
    expect(sandboxWorld.ran.filter(({ image }) => image.startsWith(`image:${saved.environment.id}:`))).toHaveLength(2);

    // A higher limit starts them again.
    const raised = await json<{ billing: BillingView }>(
      await owner.send("PUT", `${workspace}/billing/limit`, { on: true, overCents: 10_000 }),
    );
    expect(raised.billing).toMatchObject({ limit: { on: true, overCents: 10_000 }, stopped: false });
    expect(await runOn(launch, "work 1h", 4)).toMatchObject({ report: "ready" });
    expect(await billing(launch)).toMatchObject({ hours: { used: 74, over: 64 }, overageCents: 5_120 });
  }, 120_000);
});

import { describe, expect, it } from "vitest";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { UsageView } from "~/modules/settings/types.ts";
import type { SaveResult } from "~/modules/sandboxes/types.ts";
import type { AuditEntry } from "~/modules/workspace/types.ts";
import { eventually, json } from "../../test/flows.ts";
import { board, inbox, member, runOf, say, team, type Team } from "../../test/team.ts";

const sentences = async ({ owner, workspace }: Team): Promise<readonly string[]> =>
  (await json<{ entries: readonly AuditEntry[] }>(await owner.send("GET", `${workspace}/audit`))).entries.map(({ sentence }) => sentence);
const usage = async ({ owner, workspace }: Team) => (await json<{ usage: UsageView }>(await owner.send("GET", `${workspace}/usage`))).usage;

/** A task, and a run on it that runs `command`, waited for until it reports. */
async function runOn(launch: Team, command: string, n: number) {
  await say(launch, `add a task: Job ${n}`, `task-${n}`);
  await eventually(
    () => board(launch),
    ({ tasks }) => tasks.length === n,
  );
  await say(launch, `start a tester on DT-${n} run: ${command}`, `run-${n}`);
  return eventually(
    () => runOf(launch, `run-${n}`),
    ({ run }) => run?.state === "ended",
    20_000,
  );
}

describe("usage, budgets and their alerts", () => {
  it("counts sandbox hours and runs per manager, and stops a manager whose budget says stop", async () => {
    const launch = await team("budgets");
    const { owner, workspace } = launch;
    const saved = await json<SaveResult>(
      await owner.send("PUT", `${workspace}/environments`, { name: "app", setup: "pnpm install", size: "2 vCPU · 4 GB" }),
    );
    if (saved._tag !== "Saved") throw new Error(saved._tag);
    await owner.send("PUT", `${workspace}/agents/Worker/environment`, { environment: saved.environment.id });
    sandboxWorld.script("pnpm test", { stdout: "ok", seconds: 1_800 });
    sandboxWorld.script("pnpm lint", { stdout: "ok", seconds: 1_800 });

    expect(
      (await owner.send("PUT", `${workspace}/budgets`, { managerId: "mgr_nope", budget: { hours: 1, whenReached: "stop" } })).status,
    ).toBe(404);
    expect(
      (await owner.send("PUT", `${workspace}/budgets`, { managerId: launch.manager.managerId, budget: { hours: -1, whenReached: "stop" } }))
        .status,
    ).toBe(400);
    expect(
      (await owner.send("PUT", `${workspace}/budgets`, { managerId: launch.manager.managerId, budget: { hours: 1, whenReached: "maybe" } }))
        .status,
    ).toBe(400);
    const set = await owner.send("PUT", `${workspace}/budgets`, {
      managerId: launch.manager.managerId,
      budget: { hours: 1, whenReached: "stop" },
    });
    expect(set.status).toBe(200);

    await runOn(launch, "pnpm test", 1);
    // The setup took a minute and the command half an hour: 51% of the hour, no alert yet.
    expect(await usage(launch)).toMatchObject({
      sandbox: { hours: { used: 0.52 } },
      managers: [{ managerId: launch.manager.managerId, sandboxHours: 0.52, runs: 1, budget: { hours: 1, whenReached: "stop" } }],
      runs: { thisPeriod: 1, lastPeriod: 0 },
    });
    expect((await inbox(owner, launch)).filter(({ kind }) => kind === "notice")).toEqual([]);

    await runOn(launch, "pnpm lint", 2);
    const notices = (await inbox(owner, launch)).filter(({ kind }) => kind === "notice").map(({ title }) => title);
    expect(notices).toHaveLength(2);
    expect(notices).toEqual(
      expect.arrayContaining([
        "Launch has used 80% of its sandbox budget: 1.02 of its 1 sandbox hours",
        "Launch has used all of its sandbox budget: 1.02 of its 1 sandbox hours",
      ]),
    );

    const ranBefore = sandboxWorld.ran.length;
    sandboxWorld.script("pnpm build", { stdout: "never" });
    const third = await runOn(launch, "pnpm build", 3);
    expect(sandboxWorld.ran.length).toBe(ranBefore);
    expect(JSON.stringify(third)).toContain("budget");
    expect((await usage(launch)).perDay).toEqual([{ day: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u), hours: 1.02 }]);

    // Telling is not stopping: the same budget, set to tell, lets the next command run.
    await owner.send("PUT", `${workspace}/budgets`, { managerId: launch.manager.managerId, budget: { hours: 1, whenReached: "tell" } });
    await runOn(launch, "pnpm build", 4);
    expect(sandboxWorld.ran.length).toBe(ranBefore + 1);
    expect((await owner.send("PUT", `${workspace}/budgets`, { managerId: launch.manager.managerId, budget: null })).status).toBe(200);
    expect((await usage(launch)).managers[0]?.budget).toBeNull();
    expect(await sentences(launch)).toEqual(
      expect.arrayContaining([
        "Ama set the sandbox budget of Launch to 1 hours (stop when reached)",
        "Ama removed the sandbox budget of Launch",
      ]),
    );
  }, 120_000);

  it("shows usage and takes budgets from an Owner only", async () => {
    const launch = await team("budgetrefuse");
    const bo = await member(launch, "budgetrefuse-bo@example.test", "Bo");
    const body = { managerId: launch.manager.managerId, budget: { hours: 2, whenReached: "tell" } };
    expect((await bo.send("GET", `${launch.workspace}/usage`)).status).toBe(403);
    expect((await bo.send("PUT", `${launch.workspace}/budgets`, body)).status).toBe(403);
    const other = await team("budgetrefuse-other");
    expect((await other.owner.send("GET", `${launch.workspace}/usage`)).status).toBe(404);
    expect((await other.owner.send("PUT", `${launch.workspace}/budgets`, body)).status).toBe(404);
  });
});

import { describe, expect, it } from "vitest";
import type { BillingView } from "~/modules/billing/types.ts";
import { billingWorld } from "~/modules/billing/testing.ts";
import { worldClock } from "~/modules/clock/testing.ts";
import { json } from "../../test/flows.ts";
import { member, team, type Team } from "../../test/team.ts";

const DAY = 86_400_000;
const billing = async ({ owner, workspace }: Team): Promise<BillingView> =>
  (await json<{ billing: BillingView }>(await owner.send("GET", `${workspace}/billing`))).billing;

describe("billing", () => {
  it("flw:billing/seats", async () => {
    const launch = await team("seats");
    const workspaceId = launch.workspace.split("/").at(-1) ?? "";
    const seatsOf = () => billingWorld.seatChanges.filter((change) => change.workspaceId === workspaceId);
    expect(await billing(launch)).toMatchObject({ seats: 1, nextSeats: 1, hours: { included: 10 } });

    await member(launch, "bo@example.test", "Bo");
    expect(await billing(launch)).toMatchObject({ seats: 2, nextSeats: 2, hours: { included: 20 } });
    expect(seatsOf()).toEqual([{ workspaceId, seats: 2, from: "now" }]);

    const removed = await launch.owner.send("POST", "/api/auth/organization/remove-member", {
      memberIdOrEmail: "bo@example.test",
      organizationId: workspaceId,
    });
    expect(removed.status).toBe(200);
    const before = await billing(launch);
    expect(before).toMatchObject({ seats: 2, nextSeats: 1, hours: { included: 20 } });
    expect(seatsOf().at(-1)).toEqual({ workspaceId, seats: 1, from: "renewal" });

    worldClock.set(before.renewsAt + DAY);
    try {
      const after = await billing(launch);
      expect(after).toMatchObject({ seats: 1, nextSeats: 1, periodStart: before.renewsAt, hours: { included: 10 } });
      expect(after.renewsAt).toBeGreaterThan(before.renewsAt);
    } finally {
      worldClock.set(undefined);
    }
  });
});

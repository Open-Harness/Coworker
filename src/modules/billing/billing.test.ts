import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { Env } from "~/main.ts";
import { fakeClock } from "~/modules/clock/testing.ts";
import { nextMonth, openAccount } from "./service.ts";
import { fakeBilling } from "./testing.ts";

const { WORKSPACE } = env as unknown as Env;
const HOUR = 3_600;

describe("billing", () => {
  it("renews on the same day next month, or the month's last day", () => {
    expect(new Date(nextMonth(Date.UTC(2026, 0, 31, 9))).toISOString()).toBe("2026-02-28T09:00:00.000Z");
    expect(new Date(nextMonth(Date.UTC(2026, 11, 15))).toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });

  it("charges each hour past the plan once, and stops at the limit", () =>
    runInDurableObject(WORKSPACE.get(WORKSPACE.newUniqueId()), async (_instance, state) => {
      const clock = fakeClock();
      const billing = fakeBilling();
      const account = openAccount({ sql: state.storage.sql, billing, clock, workspaceId: "ws_1", since: clock.now() });
      let used = 0;
      const meter = async (key: string, hours: number) => {
        await account.metered({ key, seconds: hours * HOUR, before: used });
        used += hours * HOUR;
      };
      await meter("a", 8);
      await meter("b", 4);
      await meter("b", 0);
      expect(billing.overages).toEqual([{ workspaceId: "ws_1", key: "b", hours: 2 }]);
      await meter("c", 61);
      expect(account.view(() => used)).toMatchObject({ hours: { used: 73, included: 10, over: 63 }, overageCents: 5_040, stopped: true });
      expect(account.setLimit({ on: false, overCents: 5_000 }, () => used).stopped).toBe(false);
      clock.advance(31 * 24 * HOUR);
      expect(account.view(() => 0)).toMatchObject({ hours: { used: 0, over: 0 }, overageCents: 0 });
    }));
});

import { describe, expect, it } from "vitest";
import type { Clock } from "~/modules/page/types.ts";
import { cadence, createWords, lasting } from "./words.ts";

const at = (iso: string): number => Date.parse(iso);
const clock: Clock = { now: () => at("2026-11-26T12:00:00Z"), time: () => "12:00", short: () => "12:00" };

describe("what Juno's pages say about time", () => {
  const words = createWords(clock, "UTC");
  it("says a day, a past time and a time ahead in the workspace's zone", () => {
    expect(words.date(at("2026-09-14T08:00:00Z"))).toBe("14 Sep");
    expect(words.when(at("2026-11-26T09:00:00Z"))).toBe("Today, 12:00");
    expect(words.when(at("2026-11-25T09:00:00Z"))).toBe("Yesterday, 12:00");
    expect(words.ahead(at("2026-11-27T09:00:00Z"))).toBe("Tomorrow, 12:00");
    expect(words.ahead(at("2026-11-30T09:00:00Z"))).toBe("Mon, 12:00");
  });
  it("reads a cron expression, and shows any other as written", () => {
    expect(cadence("30 8 * * 1-5")).toBe("Weekdays, 08:30");
    expect(cadence("0 7 * * 1")).toBe("Mondays, 07:00");
    expect(cadence("*/15 * * * *")).toBe("Every 15 minutes");
    expect(cadence("0 9 1 * *")).toBe("First of the month");
    expect(cadence("5 4 2 3 *")).toBe("5 4 2 3 *");
  });
  it("says how long a wait lasts", () => {
    expect(lasting("72h")).toBe("72 hours");
    expect(lasting("1d")).toBe("1 day");
    expect(lasting("soon")).toBe("soon");
  });
});

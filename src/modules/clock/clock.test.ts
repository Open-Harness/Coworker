import { describe, expect, it } from "vitest";
import { randomIds, systemClock } from "./service.ts";
import { countingIds, fakeClock } from "./testing.ts";

describe("clock", () => {
  it("the fake clock only moves when told", () => {
    const clock = fakeClock(1000);
    expect(clock.now()).toBe(1000);
    clock.advance(500);
    expect(clock.now()).toBe(1500);
  });

  it("counting ids count per prefix; random ids differ", () => {
    const ids = countingIds();
    expect([ids.next("ws"), ids.next("ws"), ids.next("mg")]).toEqual(["ws_1", "ws_2", "mg_1"]);
    expect(randomIds.next("ws")).not.toBe(randomIds.next("ws"));
    expect(systemClock.now()).toBeGreaterThan(0);
  });
});

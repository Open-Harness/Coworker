import { describe, expect, it } from "vitest";
import { measures } from "~/modules/measures/service.ts";
import type { Standing } from "~/modules/measures/types.ts";
import { DAY, start, day, measure, objective, reading, plain } from "./measures-world.ts";

describe("measures", () => {
  it("rules:measures/where-it-is-lost", () => {
    const steps = [
      { name: "came in", in: 100, on: 90 },
      { name: "judged", in: 90, on: 40 },
      { name: "taken on", in: 40, on: 33 },
      { name: "checked", in: 33, on: 30 },
    ];
    const lost = measures.lost(steps);
    expect(lost.most).toBe("judged");
    expect(lost.steps).toEqual(steps);
    // Nothing lost anywhere, or nothing there: no step is blamed.
    expect(
      measures.lost([
        { name: "a", in: 5, on: 5 },
        { name: "b", in: 5, on: 5 },
      ]).most,
    ).toBeNull();
    expect(measures.lost([]).most).toBeNull();
    // A step that passes on more than came in lost nothing.
    expect(
      measures.lost([
        { name: "a", in: 5, on: 9 },
        { name: "b", in: 9, on: 8 },
      ]).most,
    ).toBe("b");
    // A tie: the first one it happened at.
    expect(
      measures.lost([
        { name: "first", in: 10, on: 5 },
        { name: "second", in: 5, on: 0 },
      ]).most,
    ).toBe("first");
    expect(measures.lost([{ name: "one", in: 4, on: 3 }]).most).toBe("one");
  });

  it("rules:measures/two-weeks-below-its-line-is-a-look", () => {
    const now = day(60);
    const below = (since: number): Extract<Standing, { _tag: "Read" }> => ({
      _tag: "Read",
      now: 5,
      aim: 12,
      line: 9,
      is: "below its line",
      since,
      before: 7,
      points: [],
    });
    expect(measures.needsALook(below(now - 14 * DAY), now)).toBe(true);
    expect(measures.needsALook(below(now - 14 * DAY + 1), now)).toBe(false);
    expect(measures.needsALook(below(now - 40 * DAY), now)).toBe(true);
    expect(measures.needsALook(below(now - 3 * DAY), now)).toBe(false);
    expect(measures.needsALook(below(now), now)).toBe(false);
    // Only below counts.
    for (const is of ["on its line", "reached"] as const) expect(measures.needsALook({ ...below(now - 40 * DAY), is }, now)).toBe(false);
    expect(measures.needsALook({ _tag: "NotYet", until: now + DAY, why: "Not yet." }, now)).toBe(false);
    // Whole way: readings that stay below for three weeks.
    const o = objective();
    const stuck = measures.standing(o, start, [reading(day(0), 4), reading(day(7), 4), reading(day(14), 4), reading(day(21), 4)], day(40));
    expect(measures.needsALook(stuck, day(40))).toBe(true);
    expect(measures.needsALook(stuck, day(10))).toBe(false);
  });

  it("rules:measures/a-measure-the-manager-writes-is-no-measure", () => {
    const o = objective();
    expect(measures.mayBe(o, [])).toBeNull();
    expect(measures.mayBe(o, [{ account: "crm", field: "notes" }])).toBeNull();
    // The field it reads, on the account it reads: no.
    const no = measures.mayBe(o, [
      { account: "crm", field: "notes" },
      { account: "crm", field: "stage" },
    ]);
    expect(no).not.toBeNull();
    if (no) {
      plain(no);
      expect(no).toMatch(/stage/u);
    }
    // The same field name on another account is another field.
    expect(measures.mayBe(o, [{ account: "mail", field: "stage" }])).toBeNull();
    // Any of what it reads.
    expect(measures.mayBe(o, [{ account: "crm", field: "fit" }])).not.toBeNull();
    // Said by a person: the manager cannot write it.
    const said = objective({ measure: measure("Calls", "more", { read: { from: "person", person: "bo", asks: "How many good calls?" } }) });
    expect(measures.mayBe(said, [{ account: "crm", field: "stage" }])).toBeNull();
    // Another query, another field.
    const other = objective({
      measure: measure("Solved", "more", { read: { from: "connector", account: "github", query: "issues closed and not reopened" } }),
    });
    expect(measures.mayBe(other, [{ account: "github", field: "labels" }])).toBeNull();
    expect(measures.mayBe(other, [{ account: "github", field: "reopened" }])).not.toBeNull();
  });
});

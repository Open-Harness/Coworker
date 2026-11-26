import { describe, expect, it } from "vitest";
import { measures } from "~/modules/measures/service.ts";
import { start, day, measure, objective, reading, plain, read } from "./measures-world.ts";

describe("measures", () => {
  it("rules:measures/line-is-straight", () => {
    const o = objective();
    expect(measures.line(o, start, day(0))).toBeCloseTo(6, 9);
    expect(measures.line(o, start, day(60))).toBeCloseTo(12, 9);
    expect(measures.line(o, start, day(30))).toBeCloseTo(9, 9);
    expect(measures.line(o, start, day(15))).toBeCloseTo(7.5, 9);
    expect(measures.line(o, start, day(45))).toBeCloseTo(10.5, 9);
    // Before the start it is where it began, after its date it is at its aim.
    expect(measures.line(o, start, day(-5))).toBeCloseTo(6, 9);
    expect(measures.line(o, start, day(90))).toBeCloseTo(12, 9);
    // Where less is better the line goes down, as straight.
    const down = objective({
      measure: measure("Minutes per call", "less", { before: { value: 20, at: "2026-11-01" } }),
      aim: { value: 10, by: "2026-12-31" },
    });
    expect(measures.line(down, start, day(30))).toBeCloseTo(15, 9);
    expect(measures.line(down, start, day(60))).toBeCloseTo(10, 9);
    // A later start moves the whole line.
    expect(measures.line(o, day(30), day(30))).toBeCloseTo(6, 9);
    expect(measures.line(o, day(30), day(45))).toBeCloseTo(9, 9);
  });

  it("rules:measures/not-yet-until-it-can-be-read", () => {
    const o = objective();
    // Nothing read yet.
    const none = measures.standing(o, start, [], day(40));
    expect(none._tag).toBe("NotYet");
    if (none._tag === "NotYet") {
      plain(none.why);
      expect(Number.isFinite(none.until)).toBe(true);
    }
    // Read, but not settled: it counts once `settles` has passed, so it says when.
    const early = [reading(day(30), 11)];
    const wait = measures.standing(o, start, early, day(35));
    expect(wait._tag).toBe("NotYet");
    expect(wait._tag === "NotYet" && wait.until).toBe(day(44));
    expect(measures.standing(o, start, early, day(44) - 1)._tag).toBe("NotYet");
    expect(measures.standing(o, start, early, day(44))._tag).toBe("Read");
    // The one that settles first is when.
    const two = [reading(day(30), 11), reading(day(32), 12)];
    const first = measures.standing(o, start, two, day(35));
    expect(first._tag === "NotYet" && first.until).toBe(day(44));
    // Nothing stands in for it: an unsettled number is not used while a settled one is there.
    const mixed = read(measures.standing(o, start, [reading(day(0), 8), reading(day(30), 11)], day(35)));
    expect(mixed.now).toBe(8);
    // Without a before there is no line: Not yet, and it says why.
    const unknown = objective({ measure: measure("Calls", "more", { before: { unknown: "Nobody counted calls before March" } }) });
    const blind = measures.standing(unknown, start, [reading(day(0), 8)], day(40));
    expect(blind._tag).toBe("NotYet");
    if (blind._tag === "NotYet") {
      plain(blind.why);
      expect(blind.why).toMatch(/before March|counted/u);
    }
    // Said by a person counts the same way.
    const said = objective({ measure: measure("Calls", "more", { read: { from: "person", person: "bo", asks: "How many good calls?" } }) });
    expect(measures.standing(said, start, [reading(day(30), 9)], day(35))._tag).toBe("NotYet");
    expect(measures.standing(said, start, [reading(day(30), 9)], day(45))._tag).toBe("Read");
  });

  it("rules:measures/on-its-line-or-below-or-reached", () => {
    const o = objective();
    // The line at day 40 is 10.
    const at40 = (value: number) => read(measures.standing(o, start, [reading(day(20), value)], day(40)));
    expect(at40(10).is).toBe("on its line");
    expect(at40(10.01).is).toBe("on its line");
    expect(at40(9.99).is).toBe("below its line");
    expect(at40(8).is).toBe("below its line");
    expect(at40(11.9).is).toBe("on its line");
    expect(at40(12).is).toBe("reached");
    expect(at40(15).is).toBe("reached");
    expect(at40(8)).toMatchObject({ now: 8, aim: 12 });
    expect(at40(8).line).toBeCloseTo(10, 9);
    // Where less is better, lower is better.
    const down = objective({
      measure: measure("Minutes per call", "less", { before: { value: 20, at: "2026-11-01" } }),
      aim: { value: 10, by: "2026-12-31" },
    });
    const less = (value: number) => read(measures.standing(down, start, [reading(day(20), value)], day(40)));
    expect(less(13).is).toBe("on its line");
    expect(less(13.5).is).toBe("below its line");
    expect(less(10).is).toBe("reached");
    expect(less(9).is).toBe("reached");
    expect(less(11).is).toBe("on its line");
    // The latest counted reading is the number, whatever the order they came in.
    const jumbled = [reading(day(20), 7), reading(day(0), 6), reading(day(10), 9)];
    expect(read(measures.standing(o, start, jumbled, day(40))).now).toBe(7);
    // The same reading twice is one reading: the one read later is the one.
    const twice = [reading(day(10), 9, { at: day(30) }), reading(day(10), 7, { at: day(31) })];
    expect(read(measures.standing(o, start, twice, day(40))).now).toBe(7);
    expect(read(measures.standing(o, start, [...twice].reverse(), day(40))).now).toBe(7);
    // Points are the counted readings, oldest first, each with the line where it was read.
    const seen = read(measures.standing(o, start, [reading(day(20), 8), reading(day(0), 6), reading(day(30), 9)], day(60)));
    expect(seen.points.map((p) => p.value)).toEqual([6, 8, 9]);
    expect(seen.points.map((p) => p.at)).toEqual([day(0), day(20), day(30)]);
    expect(seen.points[1]?.line).toBeCloseTo(8, 9);
    expect(seen.points[2]?.line).toBeCloseTo(9, 9);
    // Where it went below, since when, and what it was before.
    const turned = [reading(day(0), 7), reading(day(7), 7), reading(day(14), 5), reading(day(21), 5)];
    const below = read(measures.standing(o, start, turned, day(40)));
    expect(below.is).toBe("below its line");
    expect(below.since).toBe(day(14));
    expect(below.before).toBe(7);
    // Below from the first reading: since then, and nothing before.
    const always = read(measures.standing(o, start, [reading(day(0), 4), reading(day(7), 4), reading(day(14), 4)], day(40)));
    expect(always.is).toBe("below its line");
    expect(always.since).toBe(day(0));
    expect(always.before).toBeNull();
    expect(below.since).toBeLessThanOrEqual(day(40));
  });

  it("rules:measures/must-not-get-worse", () => {
    const stop = measure("People who said stop", "less", { settles: "7d" });
    const minutes = measure("Bo's minutes per call", "less", { settles: "7d" });
    const served = measure("Customers served", "more", { settles: "7d" });
    const o = objective({
      notWorse: [
        { measure: stop, limit: 2 },
        { measure: minutes, limit: 30 },
        { measure: served, limit: 100 },
      ],
    });
    const now = day(40);
    const said = measures.worse(
      o,
      {
        "People who said stop": [reading(day(10), 5), reading(day(20), 3)],
        "Bo's minutes per call": [reading(day(20), 30)],
        "Customers served": [reading(day(20), 99)],
      },
      now,
    );
    expect(said.map((w) => w.counts)).toEqual(["People who said stop", "Bo's minutes per call", "Customers served"]);
    expect(said.map((w) => w.is)).toEqual(["worse", "fine", "worse"]);
    expect(said[0]).toMatchObject({ now: 3, limit: 2 });
    expect(said[1]).toMatchObject({ now: 30, limit: 30 });
    // The latest one counts, so one that got better again is fine.
    const better = measures.worse(o, { "People who said stop": [reading(day(10), 5), reading(day(20), 1)] }, now);
    expect(better[0]?.is).toBe("fine");
    // Not read, or not settled yet: not yet, never fine.
    expect(better.slice(1).map((w) => w.is)).toEqual(["not yet", "not yet"]);
    const young = measures.worse(o, { "People who said stop": [reading(day(35), 0)] }, now);
    expect(young[0]?.is).toBe("not yet");
    expect(measures.worse(o, { "People who said stop": [reading(day(33), 9)] }, now)[0]?.is).toBe("worse");
    expect(measures.worse(o, { "People who said stop": [reading(day(33) + 1, 0)] }, now)[0]?.is).toBe("not yet");
    // What must not get worse is what is listed, no more.
    expect(measures.worse(objective(), { anything: [reading(day(0), 1)] }, now)).toEqual([]);
  });
});

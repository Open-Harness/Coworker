import { describe, expect, it } from "vitest";
import { trials } from "~/modules/trials/service.ts";
import type { PartStanding, Score } from "~/modules/trials/types.ts";
import { run, once, score, part, trial, plain } from "./trials-world.ts";

describe("trials", () => {
  it("rules:trials/score-counts-what-passed", () => {
    const runs = [...once(10, 7)];
    expect(trials.score(runs)).toMatchObject({ passed: 7, of: 10, spread: 0 });
    expect(trials.score(runs).cost).toBeCloseTo(5, 9);
    expect(trials.score(once(3, 3, "next"))).toMatchObject({ passed: 3, of: 3 });
    expect(trials.score(once(3, 0))).toMatchObject({ passed: 0, of: 3 });
    expect(trials.score([])).toMatchObject({ passed: 0, of: 0, cost: 0, spread: 0 });
    expect(trials.score([run("only", true, { cost: 2.25 })]).cost).toBeCloseTo(2.25, 9);
    // Order does not matter.
    expect(trials.score([...runs].reverse())).toEqual(trials.score(runs));
  });

  it("rules:trials/spread-is-how-far-it-moves-by-itself", () => {
    // The same cases again, and the same result each time: it does not move.
    const steady = [...once(4, 3), ...once(4, 3).map((r, i) => ({ ...r, time: 2 + i }))];
    expect(trials.score(steady)).toMatchObject({ passed: 3, of: 4, spread: 0 });
    // One case that passes once and fails once: it moves, within 0 to 1.
    const one = [...once(4, 4), ...once(4, 4).map((r, i) => (i === 0 ? { ...r, passed: false, time: 2 } : { ...r, time: 2 + i }))];
    const some = trials.score(one);
    expect(some.of).toBe(4);
    expect(some.spread).toBeGreaterThan(0);
    expect(some.spread).toBeLessThanOrEqual(1);
    expect(some.passed).toBeGreaterThanOrEqual(0);
    expect(some.passed).toBeLessThanOrEqual(4);
    // All of them flip: it moves more.
    const all = [...once(4, 4), ...once(4, 4).map((r, i) => ({ ...r, passed: false, time: 2 + i }))];
    const most = trials.score(all);
    expect(most.spread).toBeGreaterThan(some.spread);
    expect(most.spread).toBeLessThanOrEqual(1);
  });

  it("rules:trials/weakest-part-is-furthest-below-its-line", () => {
    const parts = [
      part("a", 0.5, 0.9, 10),
      part("b", 0.6, 0.8, 2),
      part("c", null, 0.9, 50),
      part("d", 0.1, 0.9, 0),
      part("e", 0.95, 0.9, 30),
    ];
    expect(trials.weakest(parts)?.eval.id).toBe("a");
    // Not yet read, never seen, and not below the line: not it, however much they would otherwise show.
    expect(trials.weakest([parts[2], parts[3], parts[4]].filter((p): p is PartStanding => p !== undefined))).toBeUndefined();
    expect(trials.weakest([])).toBeUndefined();
    expect(trials.weakest([part("x", 0.9, 0.9, 5)])).toBeUndefined();
    // Furthest below, for what it was seen on: a big gap on one piece of work against a smaller one on many.
    expect(trials.weakest([part("rare", 0.5, 0.9, 1), part("often", 0.7, 0.9, 10)])?.eval.id).toBe("often");
    expect(trials.weakest([part("rare", 0.5, 0.9, 10), part("often", 0.7, 0.9, 10)])?.eval.id).toBe("rare");
    // A tie: the first.
    expect(trials.weakest([part("first", 0.5, 0.9, 4), part("second", 0.5, 0.9, 4)])?.eval.id).toBe("first");
    expect(trials.weakest([part("second", 0.5, 0.9, 4), part("first", 0.5, 0.9, 4)])?.eval.id).toBe("second");
  });

  it("rules:trials/kept-only-if-better-by-more-than-it-varies", () => {
    const keep = (now: Score, next: Score) => trials.verdict(trial({ now, next }));
    const yes = keep(score(5, 10, 0.1), score(8, 10, 0.1));
    expect(yes.keep).toBe(true);
    plain(yes.why);
    // Better by no more than it varies by itself: not kept.
    expect(keep(score(5, 10, 0.35), score(8, 10, 0.35)).keep).toBe(false);
    expect(keep(score(4, 8, 0.25), score(6, 8, 0.25)).keep).toBe(false);
    expect(keep(score(4, 8, 0.24), score(6, 8, 0.24)).keep).toBe(true);
    const no = keep(score(5, 10, 0.3), score(6, 10, 0.3));
    plain(no.why);
    // Not better at all: the same, or worse.
    expect(keep(score(5, 10, 0), score(5, 10, 0)).keep).toBe(false);
    expect(keep(score(8, 10, 0), score(5, 10, 0)).keep).toBe(false);
    // Better by a share of the cases, whatever their number.
    expect(keep(score(5, 10, 0.1), score(16, 20, 0.1)).keep).toBe(true);
    expect(keep(score(50, 100, 0.1), score(58, 100, 0.1)).keep).toBe(false);
    expect(keep(score(0, 0, 0), score(0, 0, 0)).keep).toBe(false);
    // Cost does not make it better.
    expect(keep(score(5, 10, 0, 1), score(5, 10, 0, 0.1)).keep).toBe(false);
  });

  it("rules:trials/a-regression-or-a-worse-measure-is-never-kept", () => {
    const better = { now: score(5, 10, 0.1), next: score(9, 10, 0.1) };
    expect(trials.verdict(trial(better)).keep).toBe(true);
    // A case that passed now and fails next: not kept, and it says which one.
    const broke = trials.verdict(
      trial({ ...better, differ: [{ case: "c-lost", now: run("c-lost", true), next: run("c-lost", false, { version: "next" }) }] }),
    );
    expect(broke.keep).toBe(false);
    plain(broke.why);
    expect(broke.why).toMatch(/c-lost/u);
    // A case that failed now and passes next is what was wanted.
    const fixed = trials.verdict(
      trial({ ...better, differ: [{ case: "c-won", now: run("c-won", false), next: run("c-won", true, { version: "next" }) }] }),
    );
    expect(fixed.keep).toBe(true);
    // Both in the list: the broken one decides.
    expect(
      trials.verdict(
        trial({
          ...better,
          differ: [
            { case: "c-won", now: run("c-won", false), next: run("c-won", true, { version: "next" }) },
            { case: "c-lost", now: run("c-lost", true), next: run("c-lost", false, { version: "next" }) },
          ],
        }),
      ).keep,
    ).toBe(false);
    // A measure that is worse: not kept, and it says which.
    const worse = trials.verdict(trial({ ...better, worse: ["People who said stop"] }));
    expect(worse.keep).toBe(false);
    expect(worse.why).toMatch(/People who said stop/u);
    plain(worse.why);
  });
});

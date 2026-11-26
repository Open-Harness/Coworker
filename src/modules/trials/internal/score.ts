import type { CaseRun, Score } from "../types.ts";

/** The share of the cases that passed. No cases, nothing passed. */
export function share(score: Pick<Score, "passed" | "of">): number {
  return score.of === 0 ? 0 : score.passed / score.of;
}

function byCase(runs: readonly CaseRun[]): readonly (readonly CaseRun[])[] {
  const groups = new Map<string, CaseRun[]>();
  for (const run of runs.toSorted((a, b) => a.time - b.time)) groups.set(run.case, [...(groups.get(run.case) ?? []), run]);
  return [...groups.entries()].toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, group]) => group);
}

/** How far one case moves by itself, 0 to 1: 0 when every run gave the same, 1 when it passed as often as it failed. */
function moves(group: readonly CaseRun[]): number {
  const passes = group.filter((run) => run.passed).length;
  return (2 * Math.min(passes, group.length - passes)) / group.length;
}

/** A case passed when most of its runs did; it costs what it costs a time. A case run again counts once. */
export function score(runs: readonly CaseRun[]): Score {
  const groups = byCase(runs);
  let passed = 0;
  let cost = 0;
  let moved = 0;
  for (const group of groups) {
    if (group.filter((run) => run.passed).length * 2 > group.length) passed += 1;
    cost += group.reduce((sum, run) => sum + run.cost, 0) / group.length;
    moved += moves(group);
  }
  return { passed, of: groups.length, cost, spread: groups.length === 0 ? 0 : moved / groups.length };
}

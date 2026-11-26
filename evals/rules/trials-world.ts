import { expect } from "vitest";
import { trials } from "~/modules/trials/service.ts";
import type { Case, CaseRun, PartStanding, Score, Trial } from "~/modules/trials/types.ts";
import type { Change, Eval } from "~/modules/playbook/types.ts";

export const run = (id: string, passed: boolean, more: Partial<CaseRun> = {}): CaseRun => ({
  case: id,
  version: "now",
  time: 1,
  passed,
  says: passed ? "It did what was asked." : "It did not.",
  cost: 0.5,
  ...more,
});
/** Cases `c1` to `cN`, the first `passes` of them passing, each run once. */
export const once = (n: number, passes: number, version: "now" | "next" = "now") =>
  Array.from({ length: n }, (_, i) => run(`c${i + 1}`, i < passes, { version }));
export const score = (passed: number, of: number, spread = 0, cost = 1): Score => ({ passed, of, cost, spread });
export const part = (id: string, now: number | null, line: number, seen: number): PartStanding => {
  const part: Eval = { id, of: `steps/${id}`, good: "It works.", judge: "code", cases: [], line: { value: line, unit: "passed" } };
  return { eval: part, now, seen };
};
export const trial = (more: Partial<Omit<Trial, "id" | "says">> = {}): Omit<Trial, "id" | "says"> => ({
  of: "steps/bug/write",
  changes: [],
  now: score(5, 10, 0.1),
  next: score(8, 10, 0.1),
  differ: [],
  worse: [],
  ...more,
});
export const change = (line: string): Change => ({ line, was: "a", becomes: "b" });
export const plain = (text: string) => {
  expect(text.trim().length).toBeGreaterThan(3);
  expect(text).not.toMatch(/\b(blocked|pending)\b/iu);
};
export const input = (n: number, more: Partial<Omit<Case, "id" | "held">> = {}): Omit<Case, "id" | "held"> => ({
  of: "steps/bug/write",
  item: `item-${n}`,
  given: `An issue number ${n} came in.`,
  happened: `It answered ${n}.`,
  right: n % 2 === 0,
  saidBy: "bo",
  from: "comment",
  ...more,
});
/** Cases made one after another, as comments come. */
export const made = (counts: Readonly<Record<string, number>>): Case[] => {
  const all: Case[] = [];
  let n = 0;
  for (const [of, count] of Object.entries(counts))
    for (let i = 0; i < count; i += 1) all.push(trials.caseOf(input((n += 1), { of }), all));
  return all;
};

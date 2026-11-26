import type { BookEval, EvalKind, HistoryRow, Result, ScoreInput, ScoreProblem, ScoreReport, TestOutcome, Tier } from "../types.ts";
import { isEvalName } from "./book.ts";

export function tierOf(kind: EvalKind): Tier {
  if (kind === "ui") return "ui";
  if (kind === "live") return "live";
  return "fast";
}

/** Support tests (no eval id) that failed. */
export const brokenSupport = (outcomes: readonly TestOutcome[]): readonly TestOutcome[] =>
  outcomes.filter((outcome) => !outcome.passed && !isEvalName(outcome.name));

/**
 * A book eval passes when the one test named with its id passed (or, for computed ones, when the composition root
 * said so). A test named like an eval but missing from the book, or two tests with one id, are problems. An eval
 * whose tier did not run keeps its last result. A pass that became anything else is a regression. A failed support
 * test turns the `tests` gate red. A run with a regression keeps the last results as the baseline, so running again
 * reports the same regression instead of accepting it.
 */
export function judge(input: ScoreInput): ScoreReport {
  const redGates = [...new Set([...input.redGates, ...(brokenSupport(input.outcomes).length > 0 ? ["tests"] : [])])];
  const problems: ScoreProblem[] = redGates.map((gate) => ({ _tag: "GateRed", gate }) as const);
  const inBook = new Set(input.book.map((entry) => entry.id));
  const byId = new Map<string, boolean[]>();
  for (const outcome of input.outcomes) {
    if (!isEvalName(outcome.name)) continue;
    if (!inBook.has(outcome.name)) {
      problems.push({ _tag: "NotInBook", name: outcome.name });
      continue;
    }
    byId.set(outcome.name, [...(byId.get(outcome.name) ?? []), outcome.passed]);
  }
  for (const [id, runs] of byId) if (runs.length > 1) problems.push({ _tag: "NamedTwice", id });

  const last = input.previous?.evals ?? {};
  const resultOf = (entry: BookEval): Result => {
    const computed = input.computed[entry.id];
    if (computed !== undefined) return computed;
    const runs = byId.get(entry.id);
    if (runs !== undefined) return runs.length === 1 && runs[0] === true ? "pass" : "fail";
    if (!input.tiersRun.includes(tierOf(entry.kind))) return last[entry.id] ?? "missing";
    return "missing";
  };
  const rows = input.book.map((entry) => ({ ...entry, result: resultOf(entry) }));
  for (const row of rows) {
    if (last[row.id] === "pass" && row.result !== "pass") problems.push({ _tag: "Regressed", id: row.id, now: row.result });
  }

  const count = (result: Result): number => rows.filter((row) => row.result === result).length;
  const pass = count("pass");
  const score = redGates.length > 0 ? 0 : pass;
  const entry: HistoryRow = {
    at: input.at,
    pass,
    fail: count("fail"),
    missing: count("missing"),
    total: rows.length,
    score,
    commit: input.commit ?? null,
  };
  const regressed = problems.some(({ _tag }) => _tag === "Regressed");
  const evals = regressed ? last : Object.fromEntries(rows.map((row) => [row.id, row.result]));
  return { file: { evals, history: [...(input.previous?.history ?? []), entry] }, rows, score, problems };
}

export function describeProblem(problem: ScoreProblem): string {
  switch (problem._tag) {
    case "NotInBook":
      return `A test is named ${problem.name}, which is not in the book.`;
    case "NamedTwice":
      return `More than one test is named ${problem.id}.`;
    case "Regressed":
      return `${problem.id} passed last time and is now ${problem.now}.`;
    case "GateRed":
      return `The ${problem.gate} gate is red, so the score is 0.`;
  }
}

export function table(report: ScoreReport): string {
  const order = [...new Set(report.rows.map((row) => row.milestone))];
  const lines = order.map((milestone) => {
    const mine = report.rows.filter((row) => row.milestone === milestone);
    const pass = mine.filter((row) => row.result === "pass").length;
    const fail = mine.filter((row) => row.result === "fail").length;
    const name = `${milestone === "spike" ? "+" : milestone} ${mine[0]?.milestoneName ?? ""}`.padEnd(26);
    return `${name} ${String(pass).padStart(3)} / ${String(mine.length).padEnd(3)} pass${fail > 0 ? `   ${fail} fail` : ""}`;
  });
  const total = report.rows.length;
  return [...lines, `${"Score".padEnd(26)} ${String(report.score).padStart(3)} / ${total}`].join("\n");
}

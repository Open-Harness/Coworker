import type { Line } from "~/modules/playbook/types.ts";
import type { Walkthrough } from "../types.ts";
import { readBecause } from "./because.ts";

/** An answer nobody gave is the best one, for every question of every round. */
export function answered(walk: Walkthrough): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const round of walk.rounds) for (const question of round.questions) out[question.id] = round.answers[question.id] ?? question.best;
  return out;
}

/** A line marked you said that no asked question could have changed is a person's edit. */
function editedLines(walk: Walkthrough): ReadonlySet<Line> {
  const asked = new Set(walk.rounds.flatMap((round) => round.questions.flatMap((question) => question.changes)));
  const lines = [...readBecause(walk.draft)].filter(([line, why]) => why.why === "you said" && !asked.has(line));
  return new Set(lines.map(([line]) => line));
}

/** How good the set-up skill was: lines nobody changed, questions whose answer changed nothing. */
export function score(walk: Walkthrough): { readonly kept: number; readonly of: number; readonly idle: readonly string[] } {
  const given = answered(walk);
  const lines = readBecause(walk.draft).size;
  const idle = walk.rounds.flatMap((round) => round.questions.filter((q) => given[q.id] === q.best).map((q) => q.id));
  return { kept: lines - editedLines(walk).size, of: lines, idle };
}

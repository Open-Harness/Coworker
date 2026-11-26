import { idFor, same } from "./internal/case-of.ts";
import { held } from "./internal/held.ts";
import { judgeAgrees } from "./internal/judge.ts";
import { mayAlone } from "./internal/may-alone.ts";
import { score } from "./internal/score.ts";
import { skillStays, verdict } from "./internal/verdict.ts";
import { weakest } from "./internal/weakest.ts";
import type { Case, Trials } from "./types.ts";

/** The case it is, or the one that was there. Whether it is held is what `held` says of it among the others. */
function caseOf(input: Omit<Case, "id" | "held">, existing: readonly Case[]): Case {
  const there = existing.find((one) => same(one, input));
  if (there) return there;
  const id = idFor(input, new Set(existing.map((one) => one.id)));
  const made: Case = { ...input, id, held: false };
  return { ...made, held: held([...existing, made]).some((one) => one.id === id) };
}

export const trials: Trials = {
  score,
  weakest,
  verdict,
  mayAlone: (_now, changes) => mayAlone(changes),
  skillStays,
  caseOf,
  held,
  judgeAgrees,
};

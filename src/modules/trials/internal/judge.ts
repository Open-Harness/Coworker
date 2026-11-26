import type { Verdict } from "../types.ts";

const ENOUGH = 20;

/** A model judge is used where it agrees with the person: at least 20 judgements, and 9 in 10 the same. */
export function judgeAgrees(pairs: readonly { readonly person: boolean; readonly model: boolean }[]): Verdict {
  const same = pairs.filter((pair) => pair.person === pair.model).length;
  if (pairs.length < ENOUGH) return { keep: false, why: `Only ${pairs.length} judgements by a person so far; it needs ${ENOUGH}.` };
  if (same * 10 < pairs.length * 9) return { keep: false, why: `It agreed with the person on ${same} of ${pairs.length}, under 9 in 10.` };
  return { keep: true, why: `It agreed with the person on ${same} of ${pairs.length}, 9 in 10 or more.` };
}

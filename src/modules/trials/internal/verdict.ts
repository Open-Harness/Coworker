import type { Trial, Verdict } from "../types.ts";
import { share } from "./score.ts";

const points = (share: number): string => `${Math.round(share * 100)} points`;

/** Better by more than it varies by itself, nothing that passed fails, and no measure is worse. */
export function verdict(trial: Omit<Trial, "id" | "says">): Verdict {
  const broke = trial.differ.filter((d) => d.now.passed && !d.next.passed).map((d) => d.case);
  if (broke.length > 0) return { keep: false, why: `Not kept: ${broke.join(", ")} passed before and fails now.` };
  if (trial.worse.length > 0) return { keep: false, why: `Not kept: ${trial.worse.join(", ")} is worse.` };
  const rise = share(trial.next) - share(trial.now);
  const moves = Math.max(trial.now.spread, trial.next.spread);
  if (rise > moves) return { keep: true, why: `Better by ${points(rise)}, more than the ${points(moves)} it varies by itself.` };
  return {
    keep: false,
    why: `Not kept: better by ${points(Math.max(rise, 0))}, which is not more than the ${points(moves)} it varies by itself.`,
  };
}

/** A craft skill earns its place when the same cases come out better with it. */
export function skillStays(withIt: Trial["now"], without: Trial["now"]): Verdict {
  const rise = share(withIt) - share(without);
  if (rise > 0) return { keep: true, why: `With it the same cases come out better, by ${points(rise)}.` };
  return { keep: false, why: "With it the same cases do not come out better, so it does not stay." };
}

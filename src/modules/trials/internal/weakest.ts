import type { PartStanding } from "../types.ts";

/** Furthest below its line, for what it was seen on. Not read, never seen or not below: not it. The first on a tie. */
export function weakest(parts: readonly PartStanding[]): PartStanding | undefined {
  let found: PartStanding | undefined;
  let most = 0;
  for (const part of parts) {
    if (part.now === null || part.seen <= 0 || part.now >= part.eval.line.value) continue;
    const gap = (part.eval.line.value - part.now) * part.seen;
    if (gap > most) {
      most = gap;
      found = part;
    }
  }
  return found;
}

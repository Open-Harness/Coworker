import type { MoveSpec } from "../types.ts";

/** A declaration mistake the types can't always see: a move naming a state the machine doesn't have. */
export const checkMoves = (states: ReadonlyArray<string>, moves: Record<string, MoveSpec<string>>): void => {
  const known = new Set(states);
  for (const [key, m] of Object.entries(moves)) {
    for (const s of [...m.from, ...(typeof m.to === "string" ? [m.to] : m.to)]) {
      if (!known.has(s)) throw new globalThis.Error(`move ${key} names state ${s}, which the machine doesn't declare`);
    }
  }
};

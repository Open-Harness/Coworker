import type { Walkthrough } from "../types.ts";

export function start(id: string, by: string, said: string): Walkthrough {
  return { id, by, stage: "said", said, objective: null, rounds: [], wants: [], findings: [], draft: null, cases: [], made: null };
}

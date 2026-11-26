import type { Measures } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const measures: Measures = {
  line: () => notBuilt("measures.line"),
  standing: () => notBuilt("measures.standing"),
  worse: () => notBuilt("measures.worse"),
  lost: () => notBuilt("measures.lost"),
  needsALook: () => notBuilt("measures.needsALook"),
  mayBe: () => notBuilt("measures.mayBe"),
};

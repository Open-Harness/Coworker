import type { Walkthroughs } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const walkthroughs: Walkthroughs = {
  start: () => notBuilt("walkthrough.start"),
  walk: () => notBuilt("walkthrough.walk"),
  answered: () => notBuilt("walkthrough.answered"),
  because: () => notBuilt("walkthrough.because"),
  score: () => notBuilt("walkthrough.score"),
};

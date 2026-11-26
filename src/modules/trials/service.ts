import type { Trials } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const trials: Trials = {
  score: () => notBuilt("trials.score"),
  weakest: () => notBuilt("trials.weakest"),
  verdict: () => notBuilt("trials.verdict"),
  mayAlone: () => notBuilt("trials.mayAlone"),
  skillStays: () => notBuilt("trials.skillStays"),
  caseOf: () => notBuilt("trials.caseOf"),
  held: () => notBuilt("trials.held"),
  judgeAgrees: () => notBuilt("trials.judgeAgrees"),
};

import type { Intake } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const intake: Intake = {
  gate: () => notBuilt("intake.gate"),
  settled: () => notBuilt("intake.settled"),
  question: () => notBuilt("intake.question"),
  verdicts: () => notBuilt("intake.verdicts"),
  decide: () => notBuilt("intake.decide"),
  afterCorrection: () => notBuilt("intake.afterCorrection"),
  mayWiden: () => notBuilt("intake.mayWiden"),
};

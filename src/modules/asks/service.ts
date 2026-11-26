import type { Asks } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const asks: Asks = {
  ask: () => notBuilt("asks.ask"),
  answer: () => notBuilt("asks.answer"),
  due: () => notBuilt("asks.due"),
  whom: () => notBuilt("asks.whom"),
  covers: () => notBuilt("asks.covers"),
  afterUse: () => notBuilt("asks.afterUse"),
};

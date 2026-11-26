import type { Works } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const works: Works = {
  take: () => notBuilt("work.take"),
  move: () => notBuilt("work.move"),
  columns: () => notBuilt("work.columns"),
  stepOf: () => notBuilt("work.stepOf"),
  isDone: () => notBuilt("work.isDone"),
  says: () => notBuilt("work.says"),
};

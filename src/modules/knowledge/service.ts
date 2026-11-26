import type { Knowledge } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const knowledge: Knowledge = {
  tell: () => notBuilt("knowledge.tell"),
  mayPropose: () => notBuilt("knowledge.mayPropose"),
  clash: () => notBuilt("knowledge.clash"),
  stale: () => notBuilt("knowledge.stale"),
};

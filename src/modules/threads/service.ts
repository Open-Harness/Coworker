import type { Threads } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const threads: Threads = {
  prompt: () => notBuilt("threads.prompt"),
  offer: () => notBuilt("threads.offer"),
  read: () => notBuilt("threads.read"),
  evidence: () => notBuilt("threads.evidence"),
};

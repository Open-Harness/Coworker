import type { Coworker } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const coworker: Coworker = {
  talkingTo: () => notBuilt("coworker.talkingTo"),
  prompt: () => notBuilt("coworker.prompt"),
};

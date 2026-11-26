import type { Reaches } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const reaches: Reaches = {
  wider: () => notBuilt("reach.wider"),
  handOn: () => notBuilt("reach.handOn"),
  mandate: () => notBuilt("reach.mandate"),
  narrow: () => notBuilt("reach.narrow"),
  allowed: () => notBuilt("reach.allowed"),
};

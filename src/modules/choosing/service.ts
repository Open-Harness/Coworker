import type { Choosing } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const choosing: Choosing = {
  choose: () => notBuilt("choosing.choose"),
  price: () => notBuilt("choosing.price"),
  add: () => notBuilt("choosing.add"),
  room: () => notBuilt("choosing.room"),
  parts: () => notBuilt("choosing.parts"),
};

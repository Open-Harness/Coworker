import type { Doings } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const doings: Doings = {
  all: [],
  may: () => notBuilt("doings.may"),
  offered: () => notBuilt("doings.offered"),
  find: () => notBuilt("doings.find"),
  sentence: () => notBuilt("doings.sentence"),
  walk: () => notBuilt("doings.walk"),
};

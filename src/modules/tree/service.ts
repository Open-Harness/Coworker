import type { Tree } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const tree: Tree = {
  grow: () => notBuilt("tree.grow"),
  under: () => notBuilt("tree.under"),
  above: () => notBuilt("tree.above"),
  roll: () => notBuilt("tree.roll"),
};

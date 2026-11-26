import type { Templates } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const templates: Templates = {
  read: () => notBuilt("templates.read"),
  fill: () => notBuilt("templates.fill"),
  saveAs: () => notBuilt("templates.saveAs"),
  newer: () => notBuilt("templates.newer"),
};

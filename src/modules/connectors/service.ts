import type { Connectors } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const connectors: Connectors = {
  all: [],
  action: () => notBuilt("connectors.action"),
  checked: () => notBuilt("connectors.checked"),
  toolName: () => notBuilt("connectors.toolName"),
};

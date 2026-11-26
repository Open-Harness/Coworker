import type { Mcp } from "./types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export const mcp: Mcp = {
  starts: () => notBuilt("mcp.starts"),
  mayBe: () => notBuilt("mcp.mayBe"),
  again: () => notBuilt("mcp.again"),
  toolName: () => notBuilt("mcp.toolName"),
};

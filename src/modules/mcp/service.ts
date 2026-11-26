import { mayBe } from "./internal/may-be.ts";
import { again, toolName } from "./internal/tools.ts";
import type { Mcp } from "./types.ts";

export const mcp: Mcp = {
  starts: (tool) => (tool.readOnly ? "on" : "ask"),
  mayBe,
  again,
  toolName,
};

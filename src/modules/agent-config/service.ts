import { compile } from "@earendil-works/pi-schema";
import { agentConfig } from "./internal/schema.ts";
import type { AgentConfig, CheckAgentConfig, ToolGroup } from "./types.ts";

export { AGENT_LIMITS } from "./internal/limits.ts";
export { agentConfig, modelRef, thinkingLevel } from "./internal/schema.ts";

const compiled = compile(agentConfig);

export const checkAgentConfig: CheckAgentConfig = (value) => {
  if (compiled.check(value)) return { ok: true, value };
  const error = compiled.errors(value)[0];
  return { ok: false, message: error === undefined ? "The config is invalid" : `${error.path || "config"}: ${error.message}` };
};

/** Every group of tools, as people choose them. */
export const TOOL_GROUPS: readonly { readonly group: ToolGroup; readonly label: string; readonly description: string }[] = [
  { group: "documents", label: "Documents", description: "Writes, edits and reads the workspace's documents" },
  { group: "web", label: "Web", description: "Reads public web pages" },
  { group: "schedule", label: "Schedule", description: "Does things later, once or repeatedly" },
  { group: "history", label: "History", description: "Searches earlier chats of the workspace" },
];

export const BLANK_AGENT: AgentConfig = {
  name: "Untitled agent",
  description: "",
  thinkingLevel: "off",
  system: "",
  tools: TOOL_GROUPS.map(({ group }) => group),
  maxTurns: 50,
};

import { arr, int, obj, oneOf, opt, type Schema, str } from "@earendil-works/pi-schema";
import type { AgentConfig } from "../types.ts";
import { AGENT_LIMITS } from "./limits.ts";

const text = (maxLength: number) => str({ minLength: 1, maxLength, pattern: "\\S" });

export const thinkingLevel = oneOf(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
export const modelRef = obj({ provider: text(64), modelId: text(128) });
export const agentConfig: Schema<AgentConfig> = obj({
  name: text(AGENT_LIMITS.name),
  description: str({ maxLength: AGENT_LIMITS.description }),
  model: opt(modelRef),
  thinkingLevel,
  system: str({ maxLength: AGENT_LIMITS.system }),
  tools: arr(oneOf(["documents", "web", "schedule", "history"]), { maxItems: 4 }),
  maxTurns: int({ minimum: 1, maximum: AGENT_LIMITS.maxTurns }),
});

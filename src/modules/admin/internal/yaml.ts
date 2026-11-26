import { parse, stringify } from "yaml";
import { checkAgentConfig } from "~/modules/agent-config/service.ts";
import type { AgentConfig, Checked, ModelRef } from "~/modules/agent-config/types.ts";

/* A config as text: the form people copy, keep in a repository and paste. */

const modelText = ({ provider, modelId }: ModelRef): string => `${provider}/${modelId}`;

function modelFrom(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const slash = value.indexOf("/");
  return { provider: value.slice(0, Math.max(slash, 0)), modelId: value.slice(slash + 1) };
}

export function printConfig({ name, description, model, thinkingLevel, system, tools, maxTurns }: AgentConfig): string {
  return stringify(
    {
      name,
      description,
      ...(model === undefined ? {} : { model: modelText(model) }),
      thinking: thinkingLevel,
      system,
      tools: [...tools],
      max_turns: maxTurns,
    },
    { lineWidth: 0 },
  );
}

export function parseConfig(text: string): Checked {
  let value: unknown;
  try {
    value = parse(text);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? (error.message.split("\n")[0] ?? "") : "This is not YAML" };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false, message: "This is not a config" };
  const { model, thinking, max_turns: maxTurns, ...rest } = value as Record<string, unknown>;
  return checkAgentConfig({
    ...rest,
    ...(model === undefined || model === null ? {} : { model: modelFrom(model) }),
    thinkingLevel: thinking,
    maxTurns,
  });
}

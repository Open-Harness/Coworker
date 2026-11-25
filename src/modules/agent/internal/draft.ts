import type { MutableModels } from "@earendil-works/pi-ai/models";
import { BLANK_AGENT, checkAgentConfig, TOOL_GROUPS } from "~/modules/agent-config/service.ts";
import type { ModelRef } from "~/modules/protocol/types.ts";
import { messageText } from "~/modules/transcript/service.ts";
import type { Draft } from "../types.ts";

const INSTRUCTIONS = `You write configurations of chat agents. Answer with one JSON object and nothing else:
{"name": short name, "description": one sentence for the people choosing an agent, "system": the agent's system prompt in second person, concrete about steps, limits and output, "tools": array of the tool groups it needs}
Tool groups: ${TOOL_GROUPS.map(({ group, description }) => `"${group}" (${description.toLowerCase()})`).join(", ")}.
The agent has no other tools and reaches no other services; do not promise any.`;

const failed = (message: string): Draft => ({ ok: false, reason: "failed", message });

/** The object in an answer, also when the model wrapped it in a code fence or added a sentence. */
function objectIn(text: string): unknown {
  const body = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

export async function draftAgent(
  models: MutableModels,
  ref: ModelRef | undefined,
  description: string,
  signal: AbortSignal,
): Promise<Draft> {
  const model = ref === undefined ? undefined : models.getModel(ref.provider, ref.modelId);
  if (model === undefined) return { ok: false, reason: "no_model", message: "No model is available" };
  const messages = [{ role: "user" as const, content: `Describe your agent: ${description}`, timestamp: Date.now() }];
  const answer = await models.completeSimple(model, { systemPrompt: INSTRUCTIONS, messages }, { signal });
  if (answer.stopReason === "error" || answer.stopReason === "aborted") {
    return failed(answer.errorMessage ?? "The model did not answer");
  }
  const drafted = objectIn(messageText(answer));
  if (typeof drafted !== "object" || drafted === null) return failed("The model did not write a config. Try again");
  const checked = checkAgentConfig({ ...BLANK_AGENT, ...drafted });
  return checked.ok ? { ok: true, config: checked.value } : failed(`The model wrote a config that does not work: ${checked.message}`);
}

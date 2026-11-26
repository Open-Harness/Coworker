import { configure, type ConversationId, type ToolRegistration, type Tx } from "@earendil-works/pi-durable";
import type { AgentConfig, ToolGroup } from "~/modules/agent-config/types.ts";
import type { ModelRef } from "~/modules/protocol/types.ts";

export type ToolsByGroup = Readonly<Record<ToolGroup, readonly ToolRegistration[]>>;

export async function assignAgent(
  tx: Tx,
  chatId: ConversationId,
  { model, thinkingLevel, system, tools, maxTurns }: AgentConfig,
  byGroup: ToolsByGroup,
  isAvailable: (model: ModelRef) => boolean,
): Promise<void> {
  await configure(tx, chatId, {
    ...(model !== undefined && isAvailable(model) ? { model } : {}),
    thinkingLevel,
    instructions: system.trim() === "" ? null : system,
    tools: tools.flatMap((group) => byGroup[group]),
    maxTurns,
  });
}

import type { AgentChange } from "@earendil-works/pi-durable";
import type { RunAgent } from "~/modules/agents/types.ts";
import type { Models } from "../types.ts";

/** What it is told: its own instructions, then the skills it can read and with which tool. */
function instructionsOf(agent: RunAgent, skillTool: string | undefined): string {
  const skills =
    skillTool === undefined
      ? []
      : agent.skills.map(({ name, description, files }) => `- ${name}: ${description} (files: ${files.join(", ")})`);
  return [agent.instructions, skills.length === 0 ? "" : `Skills you can read with ${skillTool} (skill, path):\n${skills.join("\n")}`]
    .filter((part) => part.trim() !== "")
    .join("\n\n");
}

/**
 * What a saved agent changes about its conversation, but for its tools. Every setting it has is used here or named as
 * used elsewhere: a new setting in `agents` that is neither does not compile.
 */
export function settingsOf(agent: RunAgent | undefined, models: Models, skillTool: string | undefined): AgentChange {
  if (agent === undefined) return { model: models.modelFor(null) };
  const {
    model,
    thinking,
    instructions: _told,
    skills: _toldAndRead,
    tools: _chosen,
    // The run keeps these on its record: what it is called, and where its commands go.
    name: _recorded,
    version: _recordedToo,
    environment: _whereCommandsRun,
    ...unused
  } = agent;
  unused satisfies Readonly<Record<string, never>>;
  const instructions = instructionsOf(agent, skillTool);
  return { model: models.modelFor(model), thinkingLevel: thinking, ...(instructions === "" ? {} : { instructions }) };
}

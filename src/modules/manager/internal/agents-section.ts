import { section } from "@earendil-works/pi-durable";
import type { ToolEffects } from "./asking.ts";
import { DEFAULT_AGENT } from "./launch.ts";
import { ProfileDoc } from "./state.ts";

/**
 * The agents the manager may start, in its own prompt: the workspace's saved agents by name, as they are when it is
 * about to answer. A saved agent is named in `run_start`'s `agent`; without one a plain worker does the job.
 */
export const agentsSection = (effects: ToolEffects) =>
  section("agents", async (input, context) => {
    const profile = (await input.read.snapshot(ProfileDoc, context))?.profile;
    if (profile === undefined) return undefined;
    const agents = await effects
      .workspace({ ...profile })
      .agents()
      .catch(() => undefined);
    if (agents === undefined) return undefined;
    if (agents.length === 0) return `The workspace has no saved agents. run_start with no agent starts the plain ${DEFAULT_AGENT}.`;
    const lines = agents.map(
      ({ name, version, about, tools, skills }) =>
        `- ${name} (version ${version})${about === "" ? "" : `: ${about}`} [tools: ${tools.join(", ") || "none"}${skills.length === 0 ? "" : `; skills: ${skills.join(", ")}`}]`,
    );
    return [`Agents you may start with run_start (name one in "agent"; none starts the plain ${DEFAULT_AGENT}):`, ...lines].join("\n");
  });

import type { RunAgent, RunSkill } from "~/modules/agents/types.ts";
import type { AgentLookup, AgentSummary, SkillRead } from "~/modules/manager/types.ts";
import type { SettingsPlace } from "../types.ts";
import { agentView, allAgents } from "./agents.ts";
import { skillAt } from "./skills.ts";

/*
 * What a run takes from a saved agent when it starts, and what it may read of its skills afterwards. The run keeps
 * the answer, so editing or deleting the agent later changes nothing for it.
 */

const descriptionOf = (text: string | undefined): string => {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(text ?? "")?.[1] ?? "";
  return /^description:\s*(.+)$/mu.exec(block)?.[1]?.trim() ?? "";
};

function skillsOf(place: SettingsPlace, names: readonly string[]): readonly RunSkill[] {
  return names.flatMap((name): RunSkill[] => {
    const found = skillAt(place, { name });
    return found === undefined
      ? []
      : [
          {
            id: found.id,
            name,
            version: found.version,
            description: descriptionOf(found.files["SKILL.md"]),
            files: Object.keys(found.files).sort(),
          },
        ];
  });
}

/** The saved agent by this name as a run starting now takes it. */
export function agentToStart(place: SettingsPlace, name: string): AgentLookup {
  const found = place.sql.exec<{ id: string }>("SELECT id FROM agent WHERE name = ?", name.trim()).toArray()[0];
  const view = found === undefined ? undefined : agentView(place, found.id);
  if (view === undefined) return { _tag: "Gone", name, names: allAgents(place).map(({ config }) => config.name) };
  const agent: RunAgent = { ...view.config, version: view.version, skills: skillsOf(place, view.config.skills) };
  return { _tag: "Found", agent };
}

/** The agents a manager may start: name, version and the first line of what they are told. */
export const agentsToStart = (place: SettingsPlace): readonly AgentSummary[] =>
  allAgents(place).map(({ config, version }) => ({
    name: config.name,
    version,
    about:
      config.instructions
        .split("\n")
        .find((line) => line.trim() !== "")
        ?.trim()
        .slice(0, 200) ?? "",
    tools: config.tools,
    skills: config.skills,
  }));

/** A file of a skill at the version a run took. A missing path says which paths there are. */
export function readSkillFile(
  place: SettingsPlace,
  input: { readonly skill: string; readonly version: number; readonly path: string },
): SkillRead {
  const found = skillAt(place, { id: input.skill }, input.version);
  if (found === undefined) return { _tag: "Gone" };
  const text = found.files[input.path];
  return text === undefined ? { _tag: "NoFile", paths: Object.keys(found.files).sort() } : { _tag: "File", text };
}

import type { By } from "~/modules/actions/types.ts";
import { readAgentConfig, sameAgentConfig } from "~/modules/agents/service.ts";
import { type AgentConfig, PLAIN_AGENT } from "~/modules/agents/types.ts";
import type { AgentView, SettingsApi, SettingsPlace, VersionStamp } from "../types.ts";
import { choiceProblem } from "./general.ts";
import { said } from "./said.ts";

/*
 * Workspace agents, saved as versions. What an agent is (its settings, what they may be) is the agents module's; here is
 * where each version is kept. A run starting in an agent takes what it is at that moment (`internal/launch.ts`).
 */

const stampOf = (row: { version: number; saved_at: number; saved_by: string; note: string }): VersionStamp => ({
  version: row.version,
  savedAt: row.saved_at,
  savedBy: row.saved_by,
  note: row.note,
});

/** A saved config as it is now: an environment deleted since is none, so its agent runs in the plain container. */
function configOf(place: SettingsPlace, text: string): AgentConfig {
  const config = readAgentConfig(JSON.parse(text));
  return config.environment === null || hasEnvironment(place, config.environment) ? config : { ...config, environment: null };
}

const hasEnvironment = (place: SettingsPlace, id: string): boolean => place.sandboxes.environments().some((one) => one.id === id);

export function agentView(place: SettingsPlace, id: string): AgentView | undefined {
  const versions = place.sql
    .exec<{ version: number; config: string; saved_at: number; saved_by: string; note: string }>(
      "SELECT * FROM agent_version WHERE agent_id = ? ORDER BY version DESC",
      id,
    )
    .toArray();
  const latest = versions[0];
  if (latest === undefined) return undefined;
  return { id, config: configOf(place, latest.config), version: latest.version, versions: versions.map(stampOf) };
}

const idOf = (place: SettingsPlace, name: string): string | undefined =>
  place.sql.exec<{ id: string }>("SELECT id FROM agent WHERE name = ?", name).toArray()[0]?.id;

export const allAgents = (place: SettingsPlace): readonly AgentView[] =>
  place.sql
    .exec<{ id: string }>("SELECT id FROM agent ORDER BY name")
    .toArray()
    .flatMap(({ id }) => agentView(place, id) ?? []);

/** Which environment each saved agent runs in, for the Environments screen. */
export const agentEnvironments = (sql: SqlStorage): readonly { readonly agent: string; readonly environment: string }[] =>
  sql
    .exec<{ config: string }>(
      "SELECT config FROM agent_version v WHERE version = (SELECT MAX(version) FROM agent_version WHERE agent_id = v.agent_id)",
    )
    .toArray()
    .flatMap(({ config }) => {
      const { name, environment } = readAgentConfig(JSON.parse(config));
      return environment === null ? [] : [{ agent: name, environment }];
    });

/** What only the workspace knows to be wrong. The config's own rules are the agents module's. */
function problemWith(place: SettingsPlace, config: AgentConfig): string | undefined {
  const skills = new Set(
    place.sql
      .exec<{ name: string }>("SELECT name FROM skill")
      .toArray()
      .map(({ name }) => name),
  );
  const unknownSkill = config.skills.find((skill) => !skills.has(skill));
  if (unknownSkill !== undefined) return `There is no skill ${unknownSkill}`;
  if (config.environment !== null && !hasEnvironment(place, config.environment)) return "There is no such environment";
  return config.model === null ? undefined : choiceProblem(place, config.model);
}

export function saveAgent(place: SettingsPlace, { config, ...input }: Parameters<SettingsApi["saveAgent"]>[0], by: By) {
  const problem = problemWith(place, config);
  if (problem !== undefined) return { _tag: "Invalid", reason: problem } as const;
  const before = input.id === undefined ? undefined : agentView(place, input.id);
  if (input.id !== undefined && before === undefined) return { _tag: "NotFound" } as const;
  const clash = idOf(place, config.name);
  if (clash !== undefined && clash !== input.id) return { _tag: "NameTaken" } as const;
  const id = before?.id ?? place.ids.next("agent");
  const now = place.clock.now();
  if (before === undefined)
    place.sql.exec("INSERT INTO agent (id, name, created_at, created_by) VALUES (?, ?, ?, ?)", id, config.name, now, by.id);
  else place.sql.exec("UPDATE agent SET name = ? WHERE id = ?", config.name, id);
  if (before === undefined || !sameAgentConfig(before.config, config)) {
    const version = (before?.version ?? 0) + 1;
    place.sql.exec(
      "INSERT INTO agent_version (agent_id, version, config, note, saved_at, saved_by) VALUES (?, ?, ?, ?, ?, ?)",
      id,
      version,
      JSON.stringify(config),
      (input.note ?? "").slice(0, 200),
      now,
      by.name,
    );
    said(place, by, "settings.agent", `${by.name} saved ${config.name} as version ${version}`);
  }
  // A saved agent's environment is its own: what the plain Worker had by the same name is no longer read.
  place.sandboxes.assign(config.name, undefined);
  const saved = agentView(place, id);
  return saved === undefined ? ({ _tag: "NotFound" } as const) : ({ _tag: "Saved", value: saved } as const);
}

/**
 * The Environments screen's "agent to run here". A saved agent's environment is part of it, so this is a new version of
 * it; the plain Worker has nothing saved, so its environment is kept by the sandboxes.
 */
export function assignEnvironment(place: SettingsPlace, { agent, environment }: Parameters<SettingsApi["assignEnvironment"]>[0], by: By) {
  const found = environment === null ? undefined : place.sandboxes.environments().find(({ id }) => id === environment);
  if (environment !== null && found === undefined) return { _tag: "NoSuchEnvironment" } as const;
  const id = idOf(place, agent);
  const before = id === undefined ? undefined : agentView(place, id);
  if (before !== undefined) {
    const where = found?.name ?? "the plain container";
    const saved = saveAgent(place, { id: before.id, config: { ...before.config, environment }, note: `Runs in ${where}` }, by);
    // It is saved whole, so something else it names (a skill, a model) may be gone by now.
    return saved._tag === "Invalid" ? saved : ({ _tag: "Assigned" } as const);
  }
  if (agent !== PLAIN_AGENT) return { _tag: "NoSuchAgent" } as const;
  place.sandboxes.assign(agent, environment ?? undefined);
  said(place, by, "settings.agent", `${by.name} set the environment of ${agent}`);
  return { _tag: "Assigned" } as const;
}

export function deleteAgent(place: SettingsPlace, id: string, by: By) {
  const found = agentView(place, id);
  if (found === undefined) return { _tag: "NotFound" } as const;
  place.sql.exec("DELETE FROM agent_version WHERE agent_id = ?", id);
  place.sql.exec("DELETE FROM agent WHERE id = ?", id);
  said(place, by, "settings.agent", `${by.name} deleted the agent ${found.config.name}`);
  return { _tag: "Deleted" } as const;
}

import { allAgents, assignEnvironment, deleteAgent, saveAgent } from "./internal/agents.ts";
import { auditCsv } from "./internal/csv.ts";
import { deliver } from "./internal/deliver.ts";
import { deleteEnvironment, testEnvironment } from "./internal/environments.ts";
import { exportAll } from "./internal/export.ts";
import { setGeneral, viewOf } from "./internal/general.ts";
import { editEndpoint, recheckModel, removeModel, removeSecret, replaceModelKey, secretNames } from "./internal/keys.ts";
import { readLogo, removeLogo, setLogo } from "./internal/logo.ts";
import { notificationsOf, profileOf, setNotifications, setProfile } from "./internal/people.ts";
import { allChanges, ownOf, setChange } from "./internal/roles.ts";
import { said } from "./internal/said.ts";
import { allSkills, deleteSkill, saveSkill } from "./internal/skills.ts";
import { auditPolicy } from "./internal/policy.ts";
import { testMail } from "./internal/test-mail.ts";
import { alertAfter, blocked, setBudget, usage } from "./internal/usage.ts";
import type { By } from "~/modules/actions/types.ts";
import type { SettingsApi, SettingsCall, SettingsInput, SettingsName, SettingsOutput, SettingsPlace, SettingsResult } from "./types.ts";

export { AGENT_ENVIRONMENT_MIGRATIONS, SETTINGS_MIGRATIONS } from "./internal/store.ts";
export { LOGO_LIMIT } from "./internal/logo.ts";
export { agentEnvironments } from "./internal/agents.ts";
export { unzip } from "./internal/zip.ts";
export { defaultModelOf } from "./internal/general.ts";
export { auditCsv };

/** The calls of `SettingsApi` over one Workspace object's place. */
export function createSettings(place: SettingsPlace): SettingsApi {
  return {
    general: async () => viewOf(place),
    setGeneral: async (input, by) => setGeneral(place, input, by),
    rename: async ({ name, address }, by) => {
      const before = place.profile;
      await place.rename(name, address);
      if (name !== before.name) said(place, by, "settings.name", `${by.name} renamed the workspace from ${before.name} to ${name}`);
      if (address !== before.address)
        said(place, by, "settings.address", `${by.name} changed the workspace address from ${before.address} to ${address}`);
      return { _tag: "Renamed" };
    },
    logo: async () => readLogo(place),
    setLogo: (input, by) => setLogo(place, input, by),
    removeLogo: async (_input, by) => removeLogo(place, by),
    exportAll: (input, by) => exportAll(place, input, by),
    auditExported: async ({ lines }, by) => {
      said(place, by, "settings.export", `${by.name} exported ${lines} lines of the audit log`);
      return { _tag: "Noted" };
    },
    changes: async () => allChanges(place),
    ownOf: async ({ person }) => ownOf(place, person),
    setChange: async (input, by) => setChange(place, input, by),
    profile: async ({ person }) => profileOf(place, person),
    setProfile: async (input, by) => setProfile(place, input, by),
    notifications: async ({ person }) => notificationsOf(place, person),
    setNotifications: async (input, by) => setNotifications(place, input, by),
    deliver: (input, by) => deliver(place, input, by),
    policyChanged: async (input, by) => auditPolicy(place, input, by),
    testMail: (input, by) => testMail(place, input, by),
    usage: () => usage(place),
    setBudget: (input, by) => setBudget(place, input, by),
    recheckModel: ({ id }, by) => recheckModel(place, id, by),
    replaceModelKey: (input, by) => replaceModelKey(place, input, by),
    editEndpoint: (input, by) => editEndpoint(place, input, by),
    removeModel: async ({ id }, by) => removeModel(place, id, by),
    secretNames: async () => secretNames(place),
    removeSecret: async ({ name }, by) => removeSecret(place, name, by),
    deleteEnvironment: async ({ id }, by) => deleteEnvironment(place, id, by),
    testEnvironment: ({ id }, by) => testEnvironment(place, id, by),
    agents: async () => allAgents(place),
    saveAgent: async (input, by) => saveAgent(place, input, by),
    assignEnvironment: async (input, by) => assignEnvironment(place, input, by),
    deleteAgent: async ({ id }, by) => deleteAgent(place, id, by),
    skills: async () => allSkills(place),
    saveSkill: async (input, by) => saveSkill(place, input, by),
    deleteSkill: async ({ id }, by) => deleteSkill(place, id, by),
  };
}

/** Runs one `SettingsCall` against the calls of `createSettings`. */
export function runSettings(api: SettingsApi, call: SettingsCall, by: By): Promise<SettingsResult> {
  const run = api[call.name] as (input: SettingsCall["input"], by: By) => Promise<SettingsResult>;
  return run(call.input, by);
}

/** The door of a Workspace object, as far as settings need it. */
export interface SettingsDoor {
  settings(call: SettingsCall, by: By): Promise<SettingsResult | { readonly _tag: "NotProvisioned" }>;
}

/** One typed call through a Workspace object's door. */
export async function callSettings<K extends SettingsName>(
  door: SettingsDoor,
  name: K,
  input: SettingsInput<K>,
  by: By,
): Promise<SettingsOutput<K> | { readonly _tag: "NotProvisioned" }> {
  // The object answers each name with that name's own result; the union only crosses the wire.
  return (await door.settings({ name, input } as SettingsCall, by)) as SettingsOutput<K> | { readonly _tag: "NotProvisioned" };
}

/** A manager's sandbox budget, asked before a command and settled after it. */
export const budgets = { blocked, alertAfter };

export type { SettingsName };

import type { PersonPreset } from "~/modules/actions/types.ts";
import type { Page } from "../types.ts";

/** What a page asks of a person. */
export type Rule =
  | { readonly kind: "everyone" }
  /** Their preset or own change makes one action on. */
  | { readonly kind: "action"; readonly id: string }
  | { readonly kind: "role"; readonly roles: readonly PersonPreset[] }
  | { readonly kind: "all"; readonly rules: readonly Rule[] };

const everyone: Rule = { kind: "everyone" };
const action = (id: string): Rule => ({ kind: "action", id });
const all = (...rules: Rule[]): Rule => ({ kind: "all", rules });
const roles = (...allowed: PersonPreset[]): Rule => ({ kind: "role", roles: allowed });

/** A manager's pages read the manager first, so nobody whose reading of its board is off opens any of them. */
const reads = action("board.read");

/**
 * docs/old/actions.md decides: a page that shows what a read action reads needs that action (a manager's Settings, the
 * Policy and Permissions it reads: `policy.read`); the workspace's keys, members and billing are the Owner's. Agents,
 * Skills and Templates are read by everyone, and changed by Builders and Owners: the screens say so and the server
 * refuses the change; making a manager from a template needs `manager.create`. Environments hold the vault's secret names, so they are for Owners and
 * Builders. Home, the Inbox, People and your own settings are everyone's.
 */
export const RULES: Readonly<Record<Page, Rule>> = {
  home: everyone,
  inbox: everyone,
  people: everyone,
  profile: everyone,
  notifications: everyone,
  agents: everyone,
  skills: everyone,
  environments: roles("owner", "builder"),
  chat: reads,
  overview: all(reads, action("task.read")),
  board: reads,
  task: all(reads, action("task.read")),
  run: all(reads, action("run.read")),
  mission: all(reads, action("mission.read")),
  events: all(reads, action("event.read")),
  "manager-settings": all(reads, action("policy.read")),
  templates: everyone,
  workspace: roles("owner"),
};

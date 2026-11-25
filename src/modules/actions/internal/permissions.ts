import type { ActionSpec, By, Category, Permission, PermissionSet, PermissionSources, PersonPreset } from "../types.ts";
import { CATEGORY_DEFAULTS } from "./catalogue.ts";

const ALL_ON: PermissionSet = {
  categories: Object.fromEntries(Object.keys(CATEGORY_DEFAULTS).map((category) => [category, "on"])) as Record<Category, Permission>,
  actions: {},
};

/**
 * What each preset may do on a manager's screens before anyone changes it. Owners may do everything; Builders all
 * but the workspace's keys, members and billing, though they make managers; Members work the board and talk to the manager.
 */
export const PRESETS: Readonly<Record<PersonPreset, PermissionSet>> = {
  owner: ALL_ON,
  builder: { categories: { ...ALL_ON.categories, workspace: "off" }, actions: { "manager.create": "on" } },
  member: {
    categories: { ...ALL_ON.categories, board: "off", "who-may-ask": "off", sources: "off", itself: "off", workspace: "off" },
    actions: { "task.delete": "off", "page.delete": "off" },
  },
};

/** The catalogue's own setting: the action's, else its category's. */
const catalogueDefault = (spec: ActionSpec): Permission => spec.permission ?? CATEGORY_DEFAULTS[spec.category];

/** A set's say over one action: the action's own setting, else its category's, else nothing. */
const settingIn = (set: PermissionSet, spec: ActionSpec): Permission | undefined => set.actions[spec.id] ?? set.categories[spec.category];

/** The preset's default, overridden by that manager's or person's own setting. Unknown people get nothing. */
export function check(sources: PermissionSources, by: By, spec: ActionSpec): Permission {
  if (by.kind === "manager") return settingIn(sources.manager(by.id), spec) ?? catalogueDefault(spec);
  const person = sources.person(by.id);
  if (person === undefined) return "off";
  return settingIn(person.own, spec) ?? settingIn(PRESETS[person.preset], spec) ?? "off";
}

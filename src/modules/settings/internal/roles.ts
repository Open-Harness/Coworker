import { CATALOGUE } from "~/modules/actions/service.ts";
import type { By, Category, Permission, PermissionSet } from "~/modules/actions/types.ts";
import type { Invalid, PersonChange, SettingsPlace } from "../types.ts";
import { said } from "./said.ts";

/*
 * What an Owner changed for one person over their preset (model.md "Decided": Owner, Builder and Member stay as
 * presets; an owner can set any single action to on or off for any person). The same check runs for a button and a
 * manager's tool: `createActions` reads these as the person's own settings.
 */

interface Row extends Record<string, SqlStorageValue> {
  person: string;
  scope: string;
  key: string;
  value: string;
  by_id: string;
  by_name: string;
  at: number;
}

const CATEGORIES: ReadonlySet<string> = new Set(CATALOGUE.map(({ category }) => category));
const ACTIONS: ReadonlySet<string> = new Set(CATALOGUE.map(({ id }) => id));
const asPermission = (value: string): Permission => (value === "off" || value === "ask" ? value : "on");

const changeOf = (row: Row): PersonChange => ({
  person: row.person,
  scope: row.scope === "category" ? "category" : "action",
  key: row.key,
  value: asPermission(row.value),
  by: row.by_id,
  byName: row.by_name,
  at: row.at,
});

export const allChanges = (place: SettingsPlace): readonly PersonChange[] =>
  place.sql.exec<Row>("SELECT * FROM person_change ORDER BY person, scope, key").toArray().map(changeOf);

/** One person's changes in the shape the actions door reads. */
export function ownOf(place: SettingsPlace, person: string): PermissionSet {
  const categories: Partial<Record<Category, Permission>> = {};
  const actions: Record<string, Permission> = {};
  for (const row of place.sql.exec<Row>("SELECT * FROM person_change WHERE person = ?", person).toArray()) {
    if (row.scope === "category") categories[row.key as Category] = asPermission(row.value);
    else actions[row.key] = asPermission(row.value);
  }
  return { categories, actions };
}

const labelOf = (scope: string, key: string): string =>
  scope === "action" ? (CATALOGUE.find(({ id }) => id === key)?.label ?? key) : `everything in ${key}`;

export function setChange(
  place: SettingsPlace,
  input: { readonly person: string; readonly scope: "category" | "action"; readonly key: string; readonly value: Permission | null },
  by: By,
): { readonly _tag: "Set"; readonly changes: readonly PersonChange[] } | Invalid {
  const { person, scope, key, value } = input;
  const known = scope === "category" ? CATEGORIES.has(key) : ACTIONS.has(key);
  if (!known) return { _tag: "Invalid", reason: `There is no ${scope} called ${key}` };
  if (value === null) {
    place.sql.exec("DELETE FROM person_change WHERE person = ? AND scope = ? AND key = ?", person, scope, key);
    said(
      place,
      by,
      "settings.permission",
      `${by.name} removed the change to “${labelOf(scope, key)}” for ${person.replace(/^email:/u, "")}`,
    );
  } else {
    place.sql.exec(
      `INSERT INTO person_change (person, scope, key, value, by_id, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (person, scope, key) DO UPDATE SET value = excluded.value, by_id = excluded.by_id, by_name = excluded.by_name, at = excluded.at`,
      person,
      scope,
      key,
      value,
      by.id,
      by.name,
      place.clock.now(),
    );
    said(place, by, "settings.permission", `${by.name} turned “${labelOf(scope, key)}” ${value} for ${person.replace(/^email:/u, "")}`);
  }
  return { _tag: "Set", changes: allChanges(place).filter((change) => change.person === person) };
}

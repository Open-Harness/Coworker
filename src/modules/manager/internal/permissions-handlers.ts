import type { Tx } from "@earendil-works/pi-durable";
import { CATALOGUE } from "~/modules/actions/service.ts";
import type { Category, Handler, Permission } from "~/modules/actions/types.ts";
import { PermissionsDoc, ProfileDoc } from "./state.ts";
import { TEMPLATES } from "./templates.ts";

/**
 * `self.permissions`: what the manager may do, on, off or ask per category and per action. A person's button and the
 * manager's own tool run this same handler; the manager's own call is set to ask, so it cannot widen itself alone.
 */

type Handled = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly message: string };
const cannot = (message: string): Handled => ({ ok: false, message });

const CATEGORIES: ReadonlySet<string> = new Set(CATALOGUE.map(({ category }) => category));
const ACTIONS: ReadonlySet<string> = new Set(CATALOGUE.map(({ id }) => id));
const isPermission = (value: unknown): value is Permission => value === "on" || value === "off" || value === "ask";
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The changes a call asks for, or why they do not make sense. `null` takes an override away. */
function changesOf(
  value: unknown,
  known: ReadonlySet<string>,
  what: string,
):
  | { readonly ok: true; readonly changes: readonly (readonly [string, Permission | null])[] }
  | { readonly ok: false; readonly message: string } {
  if (value === undefined) return { ok: true, changes: [] };
  if (!isRecord(value)) return { ok: false, message: `Send ${what} as {name: on, off, ask or null}` };
  for (const [name, permission] of Object.entries(value)) {
    if (!known.has(name)) return { ok: false, message: `There is no ${what.slice(0, -1)} ${name}` };
    if (permission !== null && !isPermission(permission)) return { ok: false, message: `${name} is on, off, ask or null` };
  }
  return { ok: true, changes: Object.entries(value).map(([name, permission]) => [name, permission as Permission | null] as const) };
}

export function permissionsHandlers(tx: Tx): Readonly<Record<string, Handler>> {
  return {
    "self.permissions": async (input): Promise<Handled> => {
      const own = await tx.doc(PermissionsDoc);
      if (input["reset"] === true) {
        const profile = (await tx.doc(ProfileDoc)).profile;
        const template = profile === undefined ? undefined : TEMPLATES[profile.template].permissions;
        own.categories = { ...template?.categories };
        own.actions = { ...template?.actions };
        return { ok: true, value: { reset: true } };
      }
      const [categories, actions] = [
        changesOf(input["categories"], CATEGORIES, "categories"),
        changesOf(input["actions"], ACTIONS, "actions"),
      ];
      if (!categories.ok) return cannot(categories.message);
      if (!actions.ok) return cannot(actions.message);
      if (categories.changes.length + actions.changes.length === 0) return cannot("Send categories, actions, or reset: true");
      for (const [name, permission] of categories.changes) {
        if (permission === null) delete own.categories[name as Category];
        else own.categories[name as Category] = permission;
      }
      for (const [name, permission] of actions.changes) {
        if (permission === null) delete own.actions[name];
        else own.actions[name] = permission;
      }
      return { ok: true, value: { categories: categories.changes.length, actions: actions.changes.length } };
    },
  };
}

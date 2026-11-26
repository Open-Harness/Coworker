import type { By } from "~/modules/actions/types.ts";
import type { SettingsApi, SettingsPlace } from "../types.ts";
import { forgetModel } from "./general.ts";
import { said } from "./said.ts";

/** The Keys screen's writes. A key is only ever put into the vault; it comes back as nothing but a test result. */
const INTERNAL = "model:";

const labelOf = (place: SettingsPlace, id: string): string => place.models.list().find((connection) => connection.id === id)?.label ?? id;

export async function recheckModel(place: SettingsPlace, id: string, by: By) {
  const connection = await place.models.recheck(id);
  if (connection === undefined) return { _tag: "NotFound" } as const;
  said(place, by, "settings.key", `${by.name} tested ${connection.label}: ${connection.check._tag === "Works" ? "it works" : "it failed"}`);
  return { _tag: "Checked", connection } as const;
}

export async function replaceModelKey(place: SettingsPlace, input: Parameters<SettingsApi["replaceModelKey"]>[0], by: By) {
  const label = labelOf(place, input.id);
  const result = await place.models.change(input.id, { key: input.key });
  if (result === undefined) return { _tag: "NotFound" } as const;
  if (result._tag === "Invalid") return { _tag: "Invalid", reason: result.reason } as const;
  said(place, by, "settings.key", `${by.name} replaced the ${label} key`);
  return { _tag: "Replaced", connection: result.connection } as const;
}

export async function editEndpoint(place: SettingsPlace, input: Parameters<SettingsApi["editEndpoint"]>[0], by: By) {
  const { id, ...edit } = input;
  const result = await place.models.change(id, edit);
  if (result === undefined) return { _tag: "NotFound" } as const;
  if (result._tag === "Invalid") return { _tag: "Invalid", reason: result.reason } as const;
  said(place, by, "settings.key", `${by.name} edited the endpoint ${result.connection.label}`);
  return { _tag: "Edited", connection: result.connection } as const;
}

export function removeModel(place: SettingsPlace, id: string, by: By) {
  const label = labelOf(place, id);
  if (!place.models.remove(id)) return { _tag: "NotFound" } as const;
  forgetModel(place, id);
  said(place, by, "settings.key", `${by.name} removed the ${label} connection and its key`);
  return { _tag: "Removed" } as const;
}

/** The workspace's own secrets by name. Model connections keep theirs under `model:`, which is the Keys table's business. */
export const secretNames = (place: SettingsPlace) => place.vault.list().filter(({ name }) => !name.startsWith(INTERNAL));

/** The environments whose setup names a secret, as `export NAME=vault:<secret>`. */
export const usedBy = (place: SettingsPlace, name: string): readonly string[] =>
  place.sandboxes
    .environments()
    .filter(({ setup }) => setup.split("\n").some((line) => line.trim().endsWith(`=vault:${name}`)))
    .map(({ name: environment }) => environment);

export function removeSecret(place: SettingsPlace, name: string, by: By) {
  if (name.startsWith(INTERNAL))
    return { _tag: "Invalid", reason: "That is a model connection's key. Remove the connection instead" } as const;
  const using = usedBy(place, name);
  if (!place.vault.remove(name)) return { _tag: "NotFound" } as const;
  said(place, by, "settings.secret", `${by.name} removed the secret ${name}`);
  return { _tag: "Removed", usedBy: using } as const;
}

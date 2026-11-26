import type { Doing, Field, Group, Role } from "../types.ts";
import type { Permission } from "~/modules/reach/types.ts";

/** `perWork` is said "Per work", `setUp` "Set up". */
function humanize(name: string): string {
  const spaced = name.replace(/([a-z])([A-Z])/gu, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function f(name: string, is: Field["is"], needed = true): Field {
  return { name, label: humanize(name), is, needed };
}

/** One doing: who may, what the co-worker may, where it is done, what it says, and how it is undone. */
export function d(
  id: string,
  group: Group,
  needs: Role,
  coworker: Permission,
  stops: boolean,
  page: string,
  label: string,
  press: string,
  sentence: string,
  undo: string | null,
  ...fields: readonly Field[]
): Doing {
  return { id, label, group, at: { page, press }, fields, needs, coworker, stops, sentence, undo };
}

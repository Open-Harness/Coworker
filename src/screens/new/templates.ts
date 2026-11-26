import type { TemplatesView } from "~/modules/views-workspace/types.ts";

export type Row = TemplatesView["templates"][number];

/** How many managers, said plainly: “Coding and 1 other”. */
export const madeFrom = (t: Row): string => {
  const n = t.managers.length;
  const first = t.managers[0]?.name ?? "";
  if (n === 0) return "No manager yet";
  if (n === 1) return `1 manager: ${first}`;
  return `${n} managers: ${first} and ${n - 1} other`;
};
export const isBehind = (t: Row): boolean => t.managers.some((m) => m.behind);

/** The name of a connector as the workspace says it: its id when it does not. */
export const nameOf = (names: readonly { readonly id: string; readonly name: string }[], id: string): string =>
  names.find((n) => n.id === id)?.name ?? id;

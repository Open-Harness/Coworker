import type { Blank } from "../types.ts";

/* A blank in a file is `{{id}}`. */

export type Values = Readonly<Record<string, string>>;

export const blankPattern = /\{\{([A-Za-z0-9_]+)\}\}/gu;

/** The ids of the blanks written in a text, in order, once each. */
export function blankIdsIn(text: string): readonly string[] {
  return [...new Set([...text.matchAll(blankPattern)].map((m) => m[1] ?? ""))];
}

/** The id, when the whole text is one blank. */
export function wholeBlank(text: string): string | null {
  const found = /^\{\{([A-Za-z0-9_]+)\}\}$/u.exec(text);
  return found?.[1] ?? null;
}

/** Each blank put in once, as the text it is: what is put in is never read for blanks again. */
export function putText(text: string, values: Values): string {
  return text.replace(blankPattern, (whole, id: string) => values[id] ?? whole);
}

export const isNumber = (text: string): boolean => /^\d+(\.\d+)?$/u.test(text);

export interface Model {
  readonly connection: string;
  readonly model: string;
  readonly thinking: string;
}

/** `<connection> <model> <thinking>`; `inherit` is not one. */
export function modelOf(text: string): Model | null {
  const found = /^(\S+) (\S+) (off|low|medium|high)$/u.exec(text);
  return found ? { connection: found[1] ?? "", model: found[2] ?? "", thinking: found[3] ?? "" } : null;
}

export const byId = (blanks: readonly Blank[]): ReadonlyMap<string, Blank> => new Map(blanks.map((b) => [b.id, b]));

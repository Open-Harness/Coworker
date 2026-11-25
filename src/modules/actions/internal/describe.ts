import type { ActionSpec, By } from "../types.ts";

const SLOT = /\{(\w+)\}/gu;

/** How an input value reads in a sentence: a task's title, a lane's name, a list, or the value itself. */
function words(value: unknown, key: string): string {
  if (value === undefined || value === null || value === "") return key;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => words(item, key)).join(", ");
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    for (const name of ["title", "name", "label", "id"]) if (typeof record[name] === "string") return String(record[name]);
  }
  return key;
}

/** The one sentence for the audit log, the ask prompt and the task history. */
export const describe = (spec: ActionSpec, input: Readonly<Record<string, unknown>>, by: By): string =>
  spec.sentence.replace(SLOT, (_slot, key: string) => (key === "by" ? by.name : words(input[key], key)));

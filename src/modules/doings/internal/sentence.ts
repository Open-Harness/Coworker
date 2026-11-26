import type { Doing } from "../types.ts";

/** Who, and what they did: each `{field}` filled once, and what fills it is never read as a slot again. */
export function sentence(all: readonly Doing[], id: string, values: Readonly<Record<string, string>>, by: string): string {
  const doing = all.find((x) => x.id === id);
  if (!doing) return `${by} did ${id}.`;
  const said = doing.sentence.replace(/\{([^{}]+)\}/gu, (_, name: string) => {
    const given = Object.hasOwn(values, name) ? values[name] : undefined;
    return given ?? doing.fields.find((x) => x.name === name)?.label.toLowerCase() ?? "";
  });
  return `${by} ${said}`;
}

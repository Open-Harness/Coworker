import { parseYaml, dump } from "./yaml.ts";

/*
 * A file with front matter: the first block between two `---` lines, then one blank line, then the body as it is. Only the
 * first block is front matter, so the same lines in the body are text.
 */

export type Split =
  | { readonly _tag: "Split"; readonly front: string; readonly body: string }
  | { readonly _tag: "Without" }
  | { readonly _tag: "Open" };

const isRule = (line: string): boolean => line.trimEnd() === "---";

export function splitFront(text: string): Split {
  const lines = text.split("\n");
  if (lines[0] === undefined || !isRule(lines[0])) return { _tag: "Without" };
  const end = lines.findIndex((line, i) => i > 0 && isRule(line));
  if (end < 0) return { _tag: "Open" };
  const front = end > 1 ? `${lines.slice(1, end).join("\n")}\n` : "";
  const rest = lines.slice(end + 1);
  if (rest[0]?.trim() === "") rest.shift();
  return { _tag: "Split", front, body: rest.join("\n") };
}

/** The front matter as a value, or what is wrong with it. */
export function frontValue(
  front: string,
): { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly says: readonly string[] } {
  const parsed = parseYaml(front);
  return parsed.ok ? { ok: true, value: parsed.value ?? {} } : parsed;
}

export function joinFront(front: Readonly<Record<string, unknown>>, body: string): string {
  return `---\n${dump(front)}---\n\n${body}`;
}

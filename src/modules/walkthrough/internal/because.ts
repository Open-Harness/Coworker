import { parse } from "yaml";
import type { Because, Files, Line } from "~/modules/playbook/types.ts";

const FILE = "because.yaml";
const WHYS: readonly string[] = ["you said", "looked up", "my idea"];

function unquote(text: string): string {
  const plain = text.trim();
  if (!plain.startsWith('"')) return plain;
  try {
    const value: unknown = JSON.parse(plain);
    return typeof value === "string" ? value : plain;
  } catch {
    return plain;
  }
}

function quote(text: string): string {
  return /^[\s\-?[\]{}&*!|>%@`'"#]|[\s]$|:(?:\s|$)|\s#|[\n\\"]/u.test(text) || text === "" ? JSON.stringify(text) : text;
}

function isWhy(text: string): text is Because["why"] {
  return WHYS.includes(text);
}

/** The key of a top-level line `key:`, or null. */
function keyOf(line: string): string | null {
  if (/^\s/u.test(line) || !line.trimEnd().endsWith(":")) return null;
  const text = line.trimEnd().slice(0, -1);
  return text.length === 0 ? null : unquote(text);
}

function toBecause(fields: Readonly<Record<string, string>>): Because | null {
  const why = fields["why"];
  if (why === undefined || !isWhy(why)) return null;
  return {
    why,
    ...(fields["by"] === undefined ? {} : { by: fields["by"] }),
    ...(fields["where"] === undefined ? {} : { where: fields["where"] }),
  };
}

/** What the file says as YAML, in whichever style it is written (a block of fields, or `{ why: …, where: … }`). Nothing when it is not YAML. */
function parsed(text: string): Map<Line, Because> | undefined {
  let value: unknown;
  try {
    value = parse(text);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value === null ? new Map() : undefined;
  const out = new Map<Line, Because>();
  for (const [line, fields] of Object.entries(value)) {
    if (typeof fields !== "object" || fields === null) return undefined;
    const text = (name: string): string | undefined => {
      const one: unknown = (fields as Record<string, unknown>)[name];
      return typeof one === "string" ? one : undefined;
    };
    const entry = toBecause({
      ...(text("why") === undefined ? {} : { why: text("why") ?? "" }),
      ...(text("by") === undefined ? {} : { by: text("by") ?? "" }),
      ...(text("where") === undefined ? {} : { where: text("where") ?? "" }),
    });
    if (entry !== null) out.set(line, entry);
  }
  return out;
}

/** `because.yaml` as a map of lines to why they are there. */
export function readBecause(draft: Files | null): Map<Line, Because> {
  const found = parsed(draft?.[FILE] ?? "");
  if (found !== undefined) return found;
  const out = new Map<Line, Because>();
  const lines = (draft?.[FILE] ?? "").split(/\r?\n/u);
  let key: string | null = null;
  let fields: Record<string, string> = {};
  const close = () => {
    const entry = key === null ? null : toBecause(fields);
    if (key !== null && entry) out.set(key, entry);
  };
  for (const line of lines) {
    const next = keyOf(line);
    if (next !== null) {
      close();
      key = next;
      fields = {};
      continue;
    }
    const field = /^\s+(\w+):\s?(.*)$/u.exec(line);
    if (field && key !== null) fields[field[1] ?? ""] = unquote(field[2] ?? "");
  }
  close();
  return out;
}

function entryText(line: Line, because: Because): string {
  const rows = [`${quote(line)}:`, `  why: ${because.why}`];
  if (because.by !== undefined) rows.push(`  by: ${quote(because.by)}`);
  if (because.where !== undefined) rows.push(`  where: ${quote(because.where)}`);
  return rows.join("\n");
}

/** The files with `because.yaml` written out from the map. */
export function writeBecause(files: Files, because: ReadonlyMap<Line, Because>): Files {
  const text = [...because].map(([line, why]) => entryText(line, why)).join("\n");
  return { ...files, [FILE]: text === "" ? "" : `${text}\n` };
}

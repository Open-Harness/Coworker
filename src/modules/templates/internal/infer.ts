import { parse } from "yaml";
import type { Files } from "~/modules/playbook/types.ts";
import type { Template } from "../types.ts";
import { blankPattern, wholeBlank, type Values } from "./blank.ts";
import { splitMarkdown } from "./edit.ts";

/*
 * The manager's own value of each blank, found by matching what the template says to what the manager was given, thing by thing
 * (a text by its lines, a YAML file by its keys and list entries), so a line the template changed still leaves the others.
 */

type Found = Map<string, string>;
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/** The template's text as a pattern with a capture for each blank, and the ids of those captures. */
function patternOf(text: string): { readonly pattern: RegExp; readonly ids: readonly string[] } {
  const ids: string[] = [];
  let source = "";
  let at = 0;
  for (const m of text.matchAll(blankPattern)) {
    source += escape(text.slice(at, m.index)) + "([\\s\\S]*?)";
    ids.push(m[1] ?? "");
    at = (m.index ?? 0) + m[0].length;
  }
  return { pattern: new RegExp(`^${source}${escape(text.slice(at))}$`, "u"), ids };
}

function keep(found: Found, id: string, value: string): void {
  if (!found.has(id)) found.set(id, value);
}

/** A model the manager has, as the answer that makes it. */
function modelAnswer(value: Readonly<Record<string, unknown>>): string | null {
  const { connection, model, thinking } = value;
  return typeof connection === "string" && typeof model === "string" && typeof thinking === "string"
    ? `${connection} ${model} ${thinking}`
    : null;
}

function matchText(template: string, given: string, found: Found): void {
  const { pattern, ids } = patternOf(template);
  const hit = pattern.exec(given);
  if (hit !== null) ids.forEach((id, i) => keep(found, id, hit[i + 1] ?? ""));
}

function matchScalar(template: string, given: unknown, found: Found): void {
  if (!template.includes("{{")) return;
  const id = wholeBlank(template);
  if (id !== null && typeof given === "number") return keep(found, id, String(given));
  if (id !== null && isRecord(given)) {
    const model = modelAnswer(given);
    if (model !== null) keep(found, id, model);
    return;
  }
  if (typeof given === "string") matchText(template, given, found);
}

const idOf = (value: unknown): string | null => (isRecord(value) && typeof value["id"] === "string" ? value["id"] : null);

function align(template: unknown, given: unknown, found: Found): void {
  if (typeof template === "string") return matchScalar(template, given, found);
  if (Array.isArray(template) && Array.isArray(given)) {
    template.forEach((item, i) => {
      const id = idOf(item);
      align(item, id === null ? given[i] : given.find((g) => idOf(g) === id), found);
    });
    return;
  }
  if (!isRecord(template) || !isRecord(given)) return;
  for (const [key, value] of Object.entries(template)) {
    if (!key.includes("{{")) {
      align(value, given[key], found);
      continue;
    }
    const { pattern, ids } = patternOf(key);
    const hit = Object.keys(given)
      .map((k) => ({ k, m: pattern.exec(k) }))
      .find((x) => x.m !== null);
    if (hit?.m == null) continue;
    ids.forEach((id, i) => keep(found, id, hit.m?.[i + 1] ?? ""));
    align(value, given[hit.k], found);
  }
}

function valueOf(yaml: string): unknown {
  try {
    return parse(yaml, { maxAliasCount: 100 });
  } catch {
    return undefined;
  }
}

function matchLines(template: string, given: string, found: Found): void {
  const lines = given.split("\n");
  for (const line of template.split("\n")) {
    if (!line.includes("{{")) continue;
    const { pattern, ids } = patternOf(line);
    const hit = lines.map((l) => pattern.exec(l)).find((m) => m !== null);
    if (hit != null) ids.forEach((id, i) => keep(found, id, hit[i + 1] ?? ""));
  }
}

function matchFile(path: string, template: string, given: string, found: Found): void {
  if (/\.ya?ml$/u.test(path)) return align(valueOf(template), valueOf(given), found);
  const t = path.endsWith(".md") ? splitMarkdown(template) : null;
  const g = path.endsWith(".md") ? splitMarkdown(given) : null;
  if (t !== null && g !== null) {
    align(valueOf(t.front), valueOf(g.front), found);
    return matchLines(t.body, g.body, found);
  }
  matchLines(template, given, found);
}

/** What each blank is for the manager who was given `given`: found where it can be, else the best. */
export function inferValues(template: Template, given: Files): Values {
  const found: Found = new Map();
  for (const [path, text] of Object.entries(template.files)) {
    const was = given[path];
    if (text.includes("{{") && was !== undefined) matchFile(path, text, was, found);
  }
  return Object.fromEntries(template.blanks.map((b) => [b.id, found.get(b.id) ?? b.best?.value ?? ""]));
}

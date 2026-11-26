import { parseDocument } from "yaml";
import type { Files, Problem } from "~/modules/playbook/types.ts";
import type { Blank, Template } from "../types.ts";
import { blankIdsIn } from "./blank.ts";
import { readBlanks } from "./read-blanks.ts";

/* A template's folder: the playbook's files and `template.yaml`, which is the template without them. */

export type ReadTemplate =
  | { readonly _tag: "Template"; readonly template: Template }
  | { readonly _tag: "Problems"; readonly problems: readonly Problem[] };

const FILE = "template.yaml";
const KEYS = ["id", "version", "name", "about", "whose", "needs", "blanks"];

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const problem = (says: string): Problem => ({ at: FILE, says });

const wrong = (found: unknown, key: string): boolean => {
  if (key === "version") return !Number.isInteger(found) || (found as number) < 1;
  if (key === "needs") return !Array.isArray(found) || found.some((n) => typeof n !== "string");
  if (key === "blanks") return !Array.isArray(found);
  if (key === "whose") return found !== "ours" && found !== "this workspace";
  return typeof found !== "string" || found.trim() === "";
};

const sayWrong = (key: string): string =>
  key === "whose" ? "Its whose is `ours` or `this workspace`." : `Its ${key} is not what a template's ${key} is.`;

function problemsOfTop(top: Readonly<Record<string, unknown>>): readonly Problem[] {
  const unknown = Object.keys(top).filter((k) => !KEYS.includes(k));
  const missing = KEYS.filter((k) => !(k in top));
  const bad = KEYS.filter((k) => k in top && wrong(top[k], k));
  return [
    ...unknown.map((k) => problem(`It has a key, ${k}, that a template does not have.`)),
    ...missing.map((k) => problem(`It has no ${k}.`)),
    ...bad.map((k) => problem(sayWrong(k))),
  ];
}

/** `{{id}}` written in the files that is no blank. */
function problemsOfFiles(files: Files, blanks: readonly Blank[]): readonly Problem[] {
  const known = new Set(blanks.map((b) => b.id));
  return Object.entries(files).flatMap(([path, text]) =>
    blankIdsIn(text)
      .filter((id) => !known.has(id))
      .map((id) => ({ at: path, says: `It has a blank, ${id}, that the template does not ask about.` })),
  );
}

export function readTemplate(folder: Files): ReadTemplate {
  const source = folder[FILE];
  if (source === undefined) return { _tag: "Problems", problems: [problem("The template has no template.yaml.")] };
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length > 0)
    return {
      _tag: "Problems",
      problems: doc.errors.map((e) => problem(`It cannot be read as YAML: ${(e.message.split("\n")[0] ?? "").trim()}`)),
    };
  const top: unknown = doc.toJS({ maxAliasCount: 100 });
  if (!isRecord(top)) return { _tag: "Problems", problems: [problem("It is not a list of keys and what they say.")] };
  const read = readBlanks(top["blanks"]);
  const { [FILE]: _template, ...files } = folder;
  const problems = [...problemsOfTop(top), ...read.problems, ...problemsOfFiles(files, read.blanks)];
  if (problems.length > 0) return { _tag: "Problems", problems };
  return {
    _tag: "Template",
    template: {
      id: String(top["id"]),
      version: Number(top["version"]),
      name: String(top["name"]),
      about: String(top["about"]),
      whose: top["whose"] === "ours" ? "ours" : "this workspace",
      needs: (top["needs"] as readonly string[]).slice(),
      files,
      blanks: read.blanks,
    },
  };
}

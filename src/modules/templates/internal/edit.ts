import { parseDocument, type Document } from "yaml";
import type { Files } from "~/modules/playbook/types.ts";

/*
 * Files changed through what they say, not through their text: a YAML file is read as a document and written back, front matter
 * is a document and the body is text. What goes in is a value and is never read as YAML again.
 */

export interface Edits {
  /** Changes the document; says whether it did. */
  readonly doc: (doc: Document, path: string) => boolean;
  readonly text: (text: string, path: string) => string;
}

const isYaml = (path: string): boolean => /\.ya?ml$/u.test(path);
const isMarkdown = (path: string): boolean => path.endsWith(".md");
const isRule = (line: string): boolean => line.trimEnd() === "---";

function editDocument(source: string, path: string, edits: Edits): string {
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length > 0 || !edits.doc(doc, path)) return source;
  return doc.toString({ lineWidth: 0 });
}

/** The front matter (the first block between two `---` lines) and the body as it is; null when there is none. */
export function splitMarkdown(text: string): { readonly front: string; readonly body: string } | null {
  const lines = text.split("\n");
  const end = lines[0] !== undefined && isRule(lines[0]) ? lines.findIndex((line, i) => i > 0 && isRule(line)) : -1;
  if (end < 0) return null;
  return { front: end > 1 ? `${lines.slice(1, end).join("\n")}\n` : "", body: lines.slice(end + 1).join("\n") };
}

function editMarkdown(text: string, path: string, edits: Edits): string {
  const split = splitMarkdown(text);
  if (split === null) return edits.text(text, path);
  const front = split.front === "" ? "" : editDocument(split.front, path, edits);
  return `---\n${front}---\n${edits.text(split.body, path)}`;
}

export function editFile(path: string, text: string, edits: Edits): string {
  if (isYaml(path)) return editDocument(text, path, edits);
  return isMarkdown(path) ? editMarkdown(text, path, edits) : edits.text(text, path);
}

export function editFiles(files: Files, edits: Edits, only: (path: string, text: string) => boolean = () => true): Files {
  return Object.fromEntries(Object.entries(files).map(([path, text]) => [path, only(path, text) ? editFile(path, text, edits) : text]));
}

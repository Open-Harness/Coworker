import { parse, parseDocument, stringify } from "yaml";

/* YAML in and out. Reading is guarded: a hostile file is a refusal, never a throw, never code. */

export type Parsed = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly says: readonly string[] };

const firstLine = (message: string): string => (message.split("\n")[0] ?? message).trim();

/** The first document, as plain data. Aliases are read, but not past a count that could blow up; a second document is refused. */
export function parseYaml(text: string): Parsed {
  try {
    const doc = parseDocument(text, { uniqueKeys: true });
    if (doc.errors.length > 0) return { ok: false, says: doc.errors.map((e) => `It cannot be read as YAML: ${firstLine(e.message)}`) };
    return { ok: true, value: doc.toJS({ maxAliasCount: 100 }) };
  } catch (error) {
    const why = error instanceof Error ? firstLine(error.message) : "it is too much to read";
    return { ok: false, says: [`It cannot be read as YAML: ${why}`] };
  }
}

/** Text with a line break, a tab, or space at either end is where the writer of YAML can go wrong. */
function hasAwkwardText(value: unknown): boolean {
  if (typeof value === "string") return /[\n\r\t]|^\s|\s$/u.test(value);
  if (Array.isArray(value)) return value.some(hasAwkwardText);
  return typeof value === "object" && value !== null && Object.values(value).some(hasAwkwardText);
}

/**
 * The one way anything is written, so that the same value is always the same text. What the plain way would not give back (the
 * writer of YAML has a few texts it cannot keep, such as a line of only spaces) is written with every text quoted.
 */
export function dump(value: unknown): string {
  const plain = stringify(value, { lineWidth: 0, minContentWidth: 0 });
  if (!hasAwkwardText(value) || JSON.stringify(parse(plain)) === JSON.stringify(value)) return plain;
  return stringify(value, { lineWidth: 0, minContentWidth: 0, defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" });
}

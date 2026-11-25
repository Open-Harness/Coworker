import type { Searchable, SearchHit } from "../types.ts";

const SNIPPET = 80;
export const LIMIT = 20;

/** Lowercase words, accents folded, so "Café" finds "cafe". */
export const wordsOf = (text: string): readonly string[] =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "");

const prefixes = (words: readonly string[], term: string): number => words.filter((word) => word.startsWith(term)).length;

/** Markdown's marks and line breaks are not words a person reads in a results list. */
const plain = (text: string): string =>
  text
    .replace(/[#*`>]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

function snippetOf(markdown: string, term: string): string {
  const body = plain(markdown);
  const at = body.toLowerCase().indexOf(term);
  if (at < 0) return body.slice(0, SNIPPET).trim();
  const start = Math.max(0, at - SNIPPET / 2);
  const text = body.slice(start, start + SNIPPET).trim();
  return `${start > 0 ? "…" : ""}${text}${start + SNIPPET < body.length ? "…" : ""}`;
}

/** Every term must start a word of the title or body. A title word counts three times a body word. */
export function score(item: Searchable, terms: readonly string[]): number {
  const title = wordsOf(item.title);
  const body = wordsOf(item.body);
  let total = 0;
  for (const term of terms) {
    const found = 3 * prefixes(title, term) + prefixes(body, term);
    if (found === 0) return 0;
    total += found;
  }
  return total;
}

export function find(items: readonly Searchable[], query: string, limit = LIMIT): readonly SearchHit[] {
  const terms = wordsOf(query);
  if (terms.length === 0) return [];
  return items
    .map((item) => ({ ...item, score: score(item, terms), snippet: snippetOf(item.body, terms[0] ?? "") }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export const merge = (lists: readonly (readonly SearchHit[])[], limit = LIMIT): readonly SearchHit[] =>
  lists
    .flat()
    .toSorted((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

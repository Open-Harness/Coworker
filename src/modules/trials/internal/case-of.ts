import type { Case } from "../types.ts";

type Said = Omit<Case, "id" | "held">;

const FIELDS = ["of", "item", "given", "happened", "right", "saidBy", "from"] as const;

export function same(a: Said, b: Said): boolean {
  return FIELDS.every((field) => a[field] === b[field]);
}

/** Two 32-bit hashes of the text, so that the same words always come out as the same id. */
function hash(text: string): string {
  let a = 0xdeadbeef;
  let b = 0x41c6ce57;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    a = Math.imul(a ^ code, 2654435761);
    b = Math.imul(b ^ code, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return `${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}

/** An id from what the case says, and one no other case has. */
export function idFor(said: Said, taken: ReadonlySet<string>): string {
  const text = JSON.stringify(FIELDS.map((field) => said[field]));
  let id = `case-${hash(text)}`;
  for (let n = 1; taken.has(id); n += 1) id = `case-${hash(`${text}#${n}`)}`;
  return id;
}

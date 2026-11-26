import type { Note } from "../types.ts";

const negative = /^(?:never|do not|don't|don’t)\s+/u;
const always = /^always\s+/u;

/** What a note says, without case, end punctuation or a leading Always, and whether it forbids. */
function reading(says: string): { readonly body: string; readonly forbids: boolean } {
  const text = says
    .trim()
    .toLowerCase()
    .replace(/[.!?\s]+$/u, "");
  if (negative.test(text)) return { body: text.replace(negative, ""), forbids: true };
  return { body: text.replace(always, ""), forbids: false };
}

function sameManager(a: Note, b: Note): boolean {
  return a.for?.manager === b.for?.manager;
}

/** The kept notes of the same manager that say the opposite of `next`. */
export function clash(notes: readonly Note[], next: Note): readonly Note[] {
  const wanted = reading(next.says);
  return notes.filter((n) => {
    if (n.state !== "kept" || n.id === next.id || !sameManager(n, next)) return false;
    const held = reading(n.says);
    return held.body === wanted.body && held.forbids !== wanted.forbids;
  });
}

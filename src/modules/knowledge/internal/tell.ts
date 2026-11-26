import type { Note } from "../types.ts";

type To = { readonly manager: string; readonly above: readonly string[]; readonly speaksWith: readonly string[] };

function reaches(note: Note, to: To): boolean {
  if (note.for === undefined) return true;
  if (note.for.manager === to.manager) return true;
  return note.for.tree && to.above.includes(note.for.manager);
}

function visible(note: Note, to: To): boolean {
  return note.private === undefined || (to.speaksWith.length === 1 && to.speaksWith[0] === note.private);
}

/** Of notes that say the same, the newest; on a tie the first. */
function newest(notes: readonly Note[]): readonly Note[] {
  const best = new Map<string, Note>();
  for (const note of notes) {
    const key = note.says.trim();
    const held = best.get(key);
    if (held === undefined || note.at > held.at) best.set(key, note);
  }
  return notes.filter((note) => best.get(note.says.trim()) === note);
}

export function tell(notes: readonly Note[], to: To): readonly Note[] {
  return newest(notes.filter((n) => n.state === "kept" && reaches(n, to) && visible(n, to)));
}

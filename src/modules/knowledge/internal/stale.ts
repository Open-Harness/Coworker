import type { Note } from "../types.ts";

const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

/** Kept notes nobody used for 90 days; a note never used counts from when it was made. */
export function stale(notes: readonly Note[], now: number): readonly Note[] {
  return notes.filter((n) => n.state === "kept" && now - (n.used ?? n.at) >= NINETY_DAYS);
}

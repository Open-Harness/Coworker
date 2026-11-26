import type { AskingDeps, Kept } from "../types.ts";
import { isFor } from "./who.ts";

/** What waits for this person, newest first: only what is open, and only theirs. */
export function inboxOf(c: AskingDeps, person: string): readonly Kept[] {
  return c.store
    .open()
    .filter(({ ask }) => isFor(ask, person))
    .toSorted((a, b) => b.ask.at - a.ask.at);
}

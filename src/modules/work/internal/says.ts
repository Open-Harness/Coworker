import type { Work } from "../types.ts";

const ENDED = { done: "Done", no: "No", dropped: "Dropped", stopped: "Stopped", "handed over": "Handed over" } as const;

/** What it is, in a word or a few: who it waits for, or that it is working. Never blocked or pending. */
export function says(work: Work, names: Readonly<Record<string, string>>): string {
  if (work.ended !== null) return ENDED[work.ended.as];
  const name = (id: string): string => names[id] ?? id;
  if (work.waits !== null) return `Waits for ${name(work.waits.person)}`;
  const who = work.next?.who;
  if (who === undefined || who === "itself") return "Working";
  if (who === "outside") return "Waits for the customer";
  if (who === "ci") return "Waits for CI";
  return "person" in who ? `Waits for ${name(who.person)}` : `Waits for ${name(who.manager)}`;
}

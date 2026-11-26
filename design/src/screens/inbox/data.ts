/** Where an item stands, which is also the tab it shows under. `ask` waits for Ama, `wait` waits for someone else. */
export type Standing = "ask" | "wait" | "know" | "done";

export interface Option {
  id: string;
  label: string;
  /** What the toast says once this is pressed. */
  told: string;
  /** Pressing it only takes you there; the item stays in the list. */
  go?: string;
  /** Pressing it does what it says, and the item stays in the list. */
  keeps?: boolean;
}
export interface Link { label: string; to: string }

/** One thing that came to Ama from a manager. The first option is the one the manager recommends. */
export interface Item extends Record<string, unknown> {
  id: string;
  /** The manager it comes from. */
  from: string;
  title: string;
  preview: string;
  /** Short form for the row. */
  at: string;
  standing: Standing;
  /** A blue token: the co-worker proposes it. */
  isProposal?: boolean;
  /** A dot until it is opened. */
  isNew: boolean;
  /** Who it waits for, when it is not Ama. */
  waitsFor?: string;
  asks: string;
  why: string;
  looked: string[];
  options: Option[];
  otherwise: string;
  links: Link[];
  /** What Ama answered, once it is done. */
  answered?: string;
}

/** `short` is for a phone, where four tabs have to fit in 375 px. */
export const TABS: { value: Standing; label: string; short: string }[] = [
  { value: "ask", label: "Waits for you", short: "For you" },
  { value: "wait", label: "Waits for others", short: "For others" },
  { value: "know", label: "To know", short: "To know" },
  { value: "done", label: "Done", short: "Done" },
];

export function countsByStanding(all: readonly Item[]): Record<Standing, number> {
  const counts: Record<Standing, number> = { ask: 0, wait: 0, know: 0, done: 0 };
  for (const item of all) counts[item.standing] += 1;
  return counts;
}

/** The one line under the title: what is still open, in the words the tabs use. */
export function statusLine(counts: Record<Standing, number>): string {
  const parts = [`${counts.ask} wait for you`, `${counts.wait} wait for others`, `${counts.know} to know`];
  return counts.ask === 0 ? `Nothing waits for you. ${parts.slice(1).join(", ")}` : parts.join(", ");
}

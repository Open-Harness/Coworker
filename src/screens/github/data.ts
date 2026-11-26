/** What Coding sees on a repository, as GitHub shows it. */
export type Standing = "us" | "person" | "done";
export type Filter = "all" | Standing;
export const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "us", label: "Waits for us" },
  { value: "person", label: "Waits for a person" },
  { value: "done", label: "Done" },
];
export const inFilter = (i: Item, f: Filter) => f === "all" || i.standing === f;

export interface Item extends Record<string, unknown> {
  id: string;
  kind: "issue" | "pr";
  title: string;
  state: "Open" | "Merged" | "Closed";
  standing: Standing;
  /** What it waits for, in words. */
  waits: string;
  author: string;
  opened: string;
  at: string;
  /** The piece of work it became. */
  work?: string;
  labels: readonly string[];
  related?: string;
}

/** One thing in the conversation, as GitHub lists it in order. `mine`: written by the co-worker for the manager. */
export type Entry =
  | { kind: "comment"; id: string; by: string; at: string; body: readonly string[]; mine?: true; as?: string }
  | { kind: "event"; id: string; at: string; text: string }
  | { kind: "review"; id: string; by: string; at: string; verdict: string; body: string; threads: readonly string[] };

/** A review comment on a line, with the lines of the diff it is on. */
export interface Thread {
  id: string;
  file: string;
  line: number;
  hunk: string;
  answered: boolean;
  comments: readonly { by: string; at: string; body: string; mine?: true }[];
}
export interface Check {
  name: string;
  result: "passed" | "running" | "failed";
  took: string;
  what: string;
}
export interface FileChange {
  path: string;
  added: number;
  removed: number;
  patch: string;
}

/** Everything the open one adds to its row: its conversation, review, checks and files. */
export interface Opened {
  readonly entries: readonly Entry[];
  readonly threads: readonly Thread[];
  readonly checks: readonly Check[];
  readonly files: readonly FileChange[];
}

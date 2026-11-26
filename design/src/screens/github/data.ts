/* What Coding sees on acme/web, as GitHub shows it. Numbers agree with WORK and TASK in world.ts. */
export type Standing = "us" | "person" | "done";
export type Filter = "all" | Standing;
export const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: "all", label: "All" }, { value: "us", label: "Waits for us" }, { value: "person", label: "Waits for a person" }, { value: "done", label: "Done" },
];
export const inFilter = (i: Item, f: Filter) => f === "all" || i.standing === f;

export interface Item extends Record<string, unknown> {
  id: string; kind: "issue" | "pr"; title: string; state: "Open" | "Merged" | "Closed"; standing: Standing;
  /** What it waits for, in words. */
  waits: string; author: string; opened: string; at: string;
  /** The piece of work in world.ts. */
  work?: string; labels: readonly string[]; related?: string;
}
const i = (id: string, kind: Item["kind"], title: string, state: Item["state"], standing: Standing, waits: string, author: string, opened: string, at: string, rest: Partial<Item> = {}): Item =>
  ({ id, kind, title, state, standing, waits, author, opened, at, labels: [], ...rest });

export const ITEMS: readonly Item[] = [
  i("418", "pr", "Stream exports in pages", "Open", "us", "Coding answers 1 review comment", "Juno", "24 Nov, 10:23", "09:48", { work: "ACME-412", related: "Closes #412", labels: ["bug"] }),
  i("412", "issue", "Export drops rows over 150k", "Open", "us", "Pull request #418 to be merged", "Chidi Okafor", "24 Nov, 09:07", "09:48", { work: "ACME-412", related: "Fixed by #418", labels: ["bug"] }),
  i("423", "issue", "Show the plan on the billing page", "Open", "us", "Coding reads it", "Ama Mensah", "25 Nov, 09:42", "09:42", { work: "ACME-423", labels: ["feature"] }),
  i("413", "pr", "Rate limit on the public API", "Open", "person", "Chidi’s review", "Juno", "23 Nov, 11:30", "09:36", { work: "ACME-404", related: "Closes #404", labels: ["feature"] }),
  i("404", "issue", "Rate limit on the public API", "Open", "person", "Chidi’s review of #413", "Bo Larsen", "22 Nov, 14:02", "09:36", { work: "ACME-404", related: "Fixed by #413", labels: ["feature"] }),
  i("416", "pr", "Fix the tab order in the sidebar", "Open", "us", "CI", "Juno", "24 Nov, 16:40", "09:18", { work: "ACME-409", related: "Closes #409", labels: ["bug"] }),
  i("409", "issue", "Keyboard order in the sidebar", "Open", "us", "Pull request #416, in CI", "Bo Larsen", "23 Nov, 15:12", "09:18", { work: "ACME-409", related: "Fixed by #416", labels: ["bug", "a11y"] }),
  i("421", "issue", "Sign in with GitHub loops on Safari", "Open", "person", "An answer from the reporter", "mira-k", "25 Nov, 07:48", "07:52", { work: "ACME-421", labels: ["bug"] }),
  i("414", "pr", "Read report times in the workspace’s time zone", "Merged", "done", "Nothing", "Juno", "25 Nov, 05:50", "05:58", { work: "ACME-411", related: "Closed #411", labels: ["bug"] }),
  i("411", "issue", "Timezone off by one in reports", "Closed", "done", "Nothing", "Juno", "25 Nov, 05:12", "05:58", { work: "ACME-411", labels: ["bug"] }),
  i("419", "pr", "Handle the two breaking changes in payment-lib 5", "Open", "us", "The check finishes", "Juno", "25 Nov, 04:55", "04:58", { work: "ACME-415", related: "Into #415", labels: ["upkeep"] }),
  i("415", "pr", "Bump payment-lib from 4.1 to 5.0", "Open", "us", "Pull request #419 first", "dependabot", "24 Nov, 22:00", "04:58", { work: "ACME-415", labels: ["dependencies"] }),
  i("420", "pr", "Fix the typo in the invite mail", "Merged", "done", "Nothing", "Juno", "25 Nov, 00:48", "00:55", { work: "ACME-410", related: "Closed #410", labels: ["upkeep"] }),
  i("410", "issue", "Typo in the invite mail", "Closed", "done", "Nothing", "Chidi Okafor", "24 Nov, 23:30", "00:55", { work: "ACME-410", labels: ["upkeep"] }),
  i("398", "issue", "Drop Node 18", "Open", "person", "Ama’s answer: merge now, or wait for v3", "Juno", "22 Nov, 09:20", "14:27", { work: "ACME-398", labels: ["upkeep"] }),
  i("406", "issue", "Support for Internet Explorer", "Closed", "done", "Nothing", "Bo Larsen", "23 Nov, 09:00", "24 Nov", { work: "ACME-406", labels: ["feature"] }),
];

/** One thing in the conversation, as GitHub lists it in order. `mine`: written by Juno for Coding. */
export type Entry =
  | { kind: "comment"; id: string; by: string; at: string; body: readonly string[]; mine?: true; as?: string }
  | { kind: "event"; id: string; at: string; text: string }
  | { kind: "review"; id: string; by: string; at: string; verdict: string; body: string; threads: readonly string[] };

/** A review comment on a line, with the lines of the diff it is on. */
export interface Thread { id: string; file: string; line: number; hunk: string; answered: boolean; comments: readonly { by: string; at: string; body: string; mine?: true }[] }
export interface Check { name: string; result: "passed" | "running" | "failed"; took: string; what: string }
export interface FileChange { path: string; added: number; removed: number; patch: string }

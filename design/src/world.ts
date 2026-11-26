/* One sample story, used by every screen, so that a number or a name is the same wherever it shows. */

export type State = "working" | "needs-you" | "idle" | "stuck" | "paused";
export interface Person { readonly id: string; readonly name: string; readonly initials: string; readonly role: string }
export const PEOPLE: Readonly<Record<string, Person>> = {
  ama: { id: "ama", name: "Ama Mensah", initials: "AM", role: "Owner" },
  bo: { id: "bo", name: "Bo Larsen", initials: "BL", role: "Builder" },
  chidi: { id: "chidi", name: "Chidi Okafor", initials: "CO", role: "Member" },
  pat: { id: "pat", name: "Pat Reyes", initials: "PR", role: "Outside, Northwind" },
};
export const WORKSPACE = "Acme";

/** A manager. `last7` are the last 7 days. Rework: share of output a person sent back. */
export interface Manager {
  readonly id: string; readonly name: string; readonly above: string | null; readonly state: State; readonly now: string;
  readonly job: string; readonly connectors: readonly string[]; readonly mcp: readonly string[]; readonly version: number; readonly changed: string;
  readonly last7: { readonly came: number; readonly work: number; readonly out: number; readonly open: number; readonly waiting: number; readonly reworkPct: number; readonly medianHours: number; readonly cost: number; readonly threads: number };
  /** Change against the 7 days before, in percent. */
  readonly delta: { readonly came: number; readonly out: number; readonly reworkPct: number; readonly medianHours: number; readonly cost: number };
  readonly goal: { readonly text: string; readonly pct: number; readonly value: string; /** How far it should be by today, in percent. */ readonly line?: number };
}
export const MANAGERS: readonly Manager[] = [
  { id: "root", name: "Juno", above: null, state: "working", now: "Trying version 5 of Support on past mail", job: "Make, look after and improve the managers", connectors: [], mcp: [], version: 3, changed: "12 Nov",
    last7: { came: 9, work: 4, out: 3, open: 1, waiting: 1, reworkPct: 0, medianHours: 5, cost: 14, threads: 1 }, delta: { came: 0, out: 0, reworkPct: 0, medianHours: 0, cost: 6 }, goal: { text: "Every objective is on its line", pct: 50, value: "3 of 6" } },
  { id: "coding", name: "Coding", above: "root", state: "working", now: "4 threads, newest on ACME-423", job: "Take issues on acme/web to a merged pull request, or an honest no", connectors: ["GitHub", "Slack"], mcp: ["Sentry"], version: 7, changed: "21 Nov",
    last7: { came: 86, work: 24, out: 19, open: 8, waiting: 2, reworkPct: 11, medianHours: 9, cost: 148, threads: 4 }, delta: { came: 8, out: 19, reworkPct: -6, medianHours: -14, cost: 5 }, goal: { text: "20 fixes a week that stay fixed", pct: 90, value: "18 / 20", line: 86 } },
  { id: "docs", name: "Docs", above: "coding", state: "idle", now: "Waiting for the next merge", job: "Keep the docs true after each merge", connectors: ["GitHub"], mcp: [], version: 2, changed: "3 Nov",
    last7: { came: 19, work: 8, out: 8, open: 0, waiting: 0, reworkPct: 0, medianHours: 1, cost: 12, threads: 0 }, delta: { came: 19, out: 14, reworkPct: 0, medianHours: -5, cost: 2 }, goal: { text: "Docs within a day of the merge", pct: 100, value: "8 / 8" } },
  { id: "releases", name: "Releases", above: "coding", state: "needs-you", now: "Asks to cut v2.3 without the 150k fix", job: "Cut a release every second Thursday and tell people", connectors: ["GitHub", "Email"], mcp: [], version: 1, changed: "18 Nov",
    last7: { came: 11, work: 3, out: 1, open: 2, waiting: 1, reworkPct: 0, medianHours: 20, cost: 9, threads: 0 }, delta: { came: 4, out: 0, reworkPct: 0, medianHours: 8, cost: 1 }, goal: { text: "v2.3 out on 26 November", pct: 60, value: "3 / 5 steps", line: 100 } },
  { id: "support", name: "Support", above: "root", state: "stuck", now: "WhatsApp number offline for 2 hours", job: "Answer customers; hand bugs to Coding", connectors: ["Email", "WhatsApp"], mcp: ["Customer database"], version: 4, changed: "9 Nov",
    last7: { came: 212, work: 131, out: 118, open: 27, waiting: 5, reworkPct: 17, medianHours: 3, cost: 96, threads: 3 }, delta: { came: 22, out: 9, reworkPct: 4, medianHours: 31, cost: 18 }, goal: { text: "Answer in 2 hours", pct: 64, value: "3.1 h now" } },
  { id: "whatsapp", name: "WhatsApp desk", above: "support", state: "stuck", now: "Not connected since 08:10", job: "First answer on WhatsApp", connectors: ["WhatsApp"], mcp: [], version: 2, changed: "9 Nov",
    last7: { came: 94, work: 52, out: 44, open: 14, waiting: 3, reworkPct: 20, medianHours: 4, cost: 38, threads: 0 }, delta: { came: 31, out: -4, reworkPct: 7, medianHours: 40, cost: 12 }, goal: { text: "Answer in 30 minutes", pct: 48, value: "1.9 h now" } },
  { id: "sales", name: "Sales", above: "root", state: "working", now: "2 threads, writing to new leads", job: "Take a lead from first contact to a call", connectors: ["Email", "CRM", "Calendar", "Slack"], mcp: ["Search"], version: 6, changed: "23 Nov",
    last7: { came: 41, work: 33, out: 12, open: 21, waiting: 1, reworkPct: 8, medianHours: 26, cost: 52, threads: 2 }, delta: { came: 12, out: 33, reworkPct: -3, medianHours: -9, cost: 9 }, goal: { text: "12 good calls a week by 31 Dec", pct: 75, value: "9 / 12", line: 75 } },
];
export const manager = (id: string): Manager => MANAGERS.find((m) => m.id === id) ?? MANAGERS[0]!;
export const under = (id: string | null): readonly Manager[] => MANAGERS.filter((m) => m.above === id);

/** Coding's own process: the lanes of its board, which it decided. */
export const LANES = [
  { id: "triage", name: "Triage", tip: "Understand it, say what done means, or ask one question" },
  { id: "building", name: "Building", tip: "A thread works in its own copy of the repo" },
  { id: "checking", name: "Checking", tip: "A fresh thread compares the result with done-when" },
  { id: "person", name: "With a person", tip: "A review on GitHub, or an answer" },
  { id: "done", name: "Done", tip: "Merged, or closed with the reason" },
] as const;
export type Lane = (typeof LANES)[number]["id"];
export type Kind = "Bug" | "Feature" | "Upkeep";
/** A piece of work. `next`: what moves it on. `thread`: the thread on it now. */
export interface Work { readonly id: string; readonly title: string; readonly about: string; readonly lane: Lane; readonly kind: Kind; readonly from: string; readonly next: string; readonly thread?: string; readonly pr?: string; readonly age: string; readonly waits?: "you" | "person" }
export const WORK: readonly Work[] = [
  { id: "ACME-421", title: "Sign in with GitHub loops on Safari", about: "Reported by two people. Asked which Safari version.", lane: "triage", kind: "Bug", from: "Issue #421", next: "An answer from the reporter", age: "2 h" },
  { id: "ACME-423", title: "Show the plan on the billing page", about: "Feature request with a drawing. Needs a done-when.", lane: "triage", kind: "Feature", from: "Issue #423", next: "Coding reads it", thread: "thread-48", age: "12 min" },
  { id: "ACME-412", title: "Export drops rows over 150k", about: "Stream the export instead of building it in memory.", lane: "building", kind: "Bug", from: "Issue #412", next: "Review comments answered", thread: "thread-46", pr: "#418", age: "1 d" },
  { id: "ACME-417", title: "Dark mode for emails", about: "Templates done, testing in three mail clients.", lane: "building", kind: "Feature", from: "Issue #417", next: "Screenshots from the test", thread: "thread-45", age: "7 h" },
  { id: "ACME-415", title: "Update the payment library", about: "Two breaking changes handled.", lane: "checking", kind: "Upkeep", from: "Dependabot #415", next: "The check finishes", thread: "thread-47", pr: "#419", age: "5 h" },
  { id: "ACME-409", title: "Keyboard order in the sidebar", about: "Done-when met, waiting for CI.", lane: "checking", kind: "Bug", from: "Issue #409", next: "CI", pr: "#416", age: "1 d" },
  { id: "ACME-404", title: "Rate limit on the public API", about: "Chidi reviews. Asked twice about the limit per key.", lane: "person", kind: "Feature", from: "Issue #404", next: "Chidi’s review", pr: "#413", age: "2 d", waits: "person" },
  { id: "ACME-398", title: "Drop Node 18", about: "Breaks one customer’s build. Merge now, or wait for v3?", lane: "person", kind: "Upkeep", from: "Coding’s own", next: "Your answer", age: "3 d", waits: "you" },
  { id: "ACME-411", title: "Timezone off by one in reports", about: "Merged, and Support told the two customers.", lane: "done", kind: "Bug", from: "Support", next: "Nothing", pr: "#414", age: "4 h" },
  { id: "ACME-410", title: "Typo in the invite mail", about: "Merged.", lane: "done", kind: "Upkeep", from: "Issue #410", next: "Nothing", pr: "#420", age: "9 h" },
  { id: "ACME-406", title: "Support for Internet Explorer", about: "Closed as no, with the reason.", lane: "done", kind: "Feature", from: "Issue #406", next: "Nothing", age: "1 d" },
];

/** The piece of work the task page and the thread page show. */
export const TASK = {
  id: "ACME-412", title: "Export drops rows over 150k", manager: "Coding", lane: "Building", kind: "Bug", answers: "Coding", asked: "Chidi Okafor", from: "GitHub issue #412 and a mail from Northwind",
  started: "24 Nov, 09:12", cost: "$6.40", limit: "$20", attention: "4 minutes of people’s time so far",
  about: "Exports over 150,000 rows finish without an error but miss the last rows. The export is built in memory and cut off when the worker runs out. Northwind exports 212,000 rows every Monday, and noticed.",
  approach: "Stream the rows from the database to the file in pages of 5,000, so memory does not grow with the size of the export.",
  doneWhen: [
    { text: "An export of 212,000 rows has every row", done: true, by: "Test export-large, run by thread-44" },
    { text: "Memory stays under 128 MB while it runs", done: true, by: "Measured at 61 MB" },
    { text: "The docs no longer name a limit", done: true, by: "Changed in #418, read by Docs" },
    { text: "Every review comment is answered or done", done: false, by: "2 of 3" },
    { text: "Pat Reyes is told, in the same mail", done: false, by: "After the merge" },
  ],
  threads: [
    { id: "thread-43", role: "Find the cause", state: "done", said: "Found it: buffered in memory, cut at 128 MB", time: "24 Nov, 09:14", took: "11 min", cost: "$0.90" },
    { id: "thread-44", role: "Write the fix", state: "done", said: "Opened #418 with a test that fails without it", time: "24 Nov, 09:31", took: "52 min", cost: "$3.70" },
    { id: "thread-45b", role: "Check it, fresh", state: "done", said: "Done-when met. Asked for a test on an empty export", time: "24 Nov, 10:40", took: "14 min", cost: "$1.10" },
    { id: "thread-46", role: "Answer the review", state: "working", said: "Working on the third comment", time: "25 Nov, 09:48", took: "6 min so far", cost: "$0.70" },
  ],
  links: [
    { kind: "Issue", id: "acme/web #412", title: "Export drops rows over 150k", state: "Open" },
    { kind: "Pull request", id: "acme/web #418", title: "Stream exports in pages", state: "CI passed, 1 comment open" },
    { kind: "Mail", id: "Support SUP-88", title: "Re: Monday export is short", state: "Pat Reyes waits" },
  ],
  evidence: [
    { name: "export-large.test.ts", what: "Fails before, passes after", size: "Test", by: "thread-44" },
    { name: "memory-212k.txt", what: "Highest use 61 MB", size: "3 KB", by: "thread-44" },
    { name: "check-report.md", what: "What the fresh check looked at", size: "6 KB", by: "thread-45b" },
  ],
  activity: [
    { who: "Coding", when: "25 Nov, 09:48", text: "Started thread-46 to answer Chidi’s review." },
    { who: "Chidi Okafor", when: "25 Nov, 09:41", text: "Left 3 comments on #418, on GitHub." },
    { who: "Coding", when: "24 Nov, 10:56", text: "Asked Chidi to review #418." },
    { who: "Support", when: "24 Nov, 09:20", text: "Handed over Pat Reyes’s mail: they export 212,000 rows every Monday." },
    { who: "Coding", when: "24 Nov, 09:12", text: "Took the issue, and wrote what done means." },
  ],
} as const;

/** thread-46, as it happened. `call` entries are tool calls. */
export const TRACE = {
  id: "thread-46", role: "Answer the review", task: "ACME-412", manager: "Coding", version: 7, model: "Claude Sonnet 5.5", state: "working", started: "25 Nov, 09:48", took: "6 min", cost: "$0.70", mayUse: ["GitHub: read acme/web", "GitHub: push to export-stream", "GitHub: comment on #418", "Run commands in its own copy"],
  brief: "Answer every comment Chidi left on #418, by doing it or by saying why not. Do not widen the change. Done when no comment is open and CI passes.",
  turns: [
    { kind: "say", at: "09:48", text: "Three comments. I’ll read the pull request and the code they are on." },
    { kind: "call", at: "09:48", tool: "github.read_pull", target: "acme/web #418", took: "0.8 s", ok: true, out: "3 open comments from chidi\n1. src/export/stream.ts:41  page size as a constant?\n2. src/export/stream.ts:66  what if a row is deleted between pages?\n3. src/export/stream.ts:88  close the cursor on error" },
    { kind: "call", at: "09:49", tool: "read", target: "src/export/stream.ts", took: "0.1 s", ok: true, out: "112 lines" },
    { kind: "think", at: "09:49", text: "The second one is right. Pages go by offset, so a deleted row moves the next page up by one, and one row is missed. Paging by the last id does not have that problem. That is inside the change: it is the same loop." },
    { kind: "say", at: "09:50", text: "Comment 2 is a real bug: a row deleted between pages makes the next page skip one. I’ll page by id instead of offset." },
    { kind: "call", at: "09:51", tool: "edit", target: "src/export/stream.ts", took: "0.2 s", ok: true, out: "+14 −9" },
    { kind: "call", at: "09:52", tool: "run", target: "pnpm vitest run export", took: "21 s", ok: false, out: "FAIL  src/export/stream.test.ts > an empty export\nexpected 0 rows, got an error: no last id" },
    { kind: "say", at: "09:52", text: "An empty export has no last id. Starting from 0 instead." },
    { kind: "call", at: "09:53", tool: "run", target: "pnpm vitest run export", took: "20 s", ok: true, out: "PASS  18 tests" },
    { kind: "call", at: "09:53", tool: "github.reply", target: "#418, comment 1", took: "0.6 s", ok: true, out: "Done in 4f21c9a." },
    { kind: "call", at: "09:54", tool: "github.reply", target: "#418, comment 2", took: "0.6 s", ok: true, out: "You’re right, it missed a row. Now pages by id, with a test." },
    { kind: "say", at: "09:54", text: "Now the cursor on error." },
  ],
  diff: "--- a/src/export/stream.ts\n+++ b/src/export/stream.ts\n@@ -38,12 +38,15 @@\n-const rows = await db.page({ offset, limit: 5000 });\n+const rows = await db.page({ after: lastId, limit: PAGE });\n if (rows.length === 0) break;\n-offset += rows.length;\n+lastId = rows[rows.length - 1].id;\n await file.write(rows);",
} as const;

/** What Root wrote about the last 7 days, newest judgement first. */
export const WHAT_CHANGED = [
  { tone: "error", title: "Support is slower: 3.1 hours, the aim is 2", text: "WhatsApp messages grew by a third and the number has been offline since 08:10. A person must scan it again: it is in your inbox." },
  { tone: "success", title: "Coding sends less back: 17% to 11%", text: "Version 7 asks what done means before it starts. Kept." },
  { tone: "info", title: "Trying version 5 of Support", text: "Runs on 40 past mails beside version 4. 12 done: 2 better, 10 the same." },
] as const;
export const DAYS = ["19 Nov", "20 Nov", "21 Nov", "22 Nov", "23 Nov", "24 Nov", "25 Nov"] as const;
export const DAILY = { came: [52, 61, 58, 20, 18, 71, 70], out: [22, 26, 27, 9, 8, 30, 31], rework: [16, 15, 14, 14, 12, 12, 11], cost: [57, 62, 66, 25, 23, 74, 62] } as const;

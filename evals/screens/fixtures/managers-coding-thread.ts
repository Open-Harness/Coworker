import type { ThreadView } from "~/modules/threads/types.ts";
import { head, MIN } from "./managers-kit.ts";
import { THREAD_ROWS } from "./managers-coding-threads.ts";
import { at, read, type Fixture } from "./read.ts";

/* thread-46, as it happened: "Answer the review", on ACME-412, six minutes in. */

const T = (hhmm: string): number => at(`25 Nov ${hhmm}`);
const said = (n: number, hhmm: string, text: string): ThreadView["lines"][number] => ({ id: `l${n}`, at: T(hhmm), is: "said", text });
const call = (
  n: number,
  hhmm: string,
  tool: string,
  target: string,
  took: number,
  ok: boolean,
  out: string,
  args: unknown = {},
): ThreadView["lines"][number] => ({
  id: `l${n}`,
  at: T(hhmm),
  is: "called",
  tool,
  target,
  args,
  out,
  ok,
  took,
});

const DIFF =
  "--- a/src/export/stream.ts\n+++ b/src/export/stream.ts\n@@ -38,12 +38,15 @@\n-const rows = await db.page({ offset, limit: 5000 });\n+const rows = await db.page({ after: lastId, limit: PAGE });\n if (rows.length === 0) break;\n-offset += rows.length;\n+lastId = rows[rows.length - 1].id;\n await file.write(rows);";

const LINES: ThreadView["lines"] = [
  said(1, "09:48", "Three comments. I’ll read the pull request and the code they are on."),
  call(
    2,
    "09:48",
    "github.read_pull",
    "acme/web #418",
    800,
    true,
    "3 open comments from chidi\n1. src/export/stream.ts:41  page size as a constant?\n2. src/export/stream.ts:66  what if a row is deleted between pages?\n3. src/export/stream.ts:88  close the cursor on error",
    { repo: "acme/web", number: 418 },
  ),
  call(3, "09:49", "read", "src/export/stream.ts", 100, true, "112 lines", { path: "src/export/stream.ts" }),
  {
    id: "l4",
    at: T("09:49"),
    is: "thought",
    text: "The second one is right. Pages go by offset, so a deleted row moves the next page up by one, and one row is missed. Paging by the last id does not have that problem. That is inside the change: it is the same loop.",
  },
  said(5, "09:50", "Comment 2 is a real bug: a row deleted between pages makes the next page skip one. I’ll page by id instead of offset."),
  call(6, "09:51", "edit", "src/export/stream.ts", 200, true, "+14 −9", { path: "src/export/stream.ts" }),
  call(
    7,
    "09:52",
    "run",
    "pnpm vitest run export",
    21_000,
    false,
    "FAIL  src/export/stream.test.ts > an empty export\nexpected 0 rows, got an error: no last id",
    { command: "pnpm vitest run export" },
  ),
  said(8, "09:52", "An empty export has no last id. Starting from 0 instead."),
  call(9, "09:53", "run", "pnpm vitest run export", 20_000, true, "PASS  18 tests", { command: "pnpm vitest run export" }),
  call(10, "09:53", "github.reply", "#418, comment 1", 600, true, "Done in 4f21c9a.", { comment: 1 }),
  call(11, "09:54", "github.reply", "#418, comment 2", 600, true, "You’re right, it missed a row. Now pages by id, with a test.", {
    comment: 2,
  }),
  said(12, "09:54", "Now the cursor on error."),
];

const row = THREAD_ROWS.find((one) => one.id === "thread-46");
if (row === undefined) throw new Error("thread-46 is not in the threads");

const THREAD: ThreadView = {
  id: row.id,
  manager: row.manager,
  work: row.work,
  under: row.under,
  agent: row.agent,
  role: row.role,
  version: row.version,
  model: row.model,
  on: row.on,
  state: row.state,
  started: row.started,
  took: 6 * MIN,
  cost: row.cost,
  mayUse: ["GitHub: read acme/web", "GitHub: push to export-stream", "GitHub: comment on #418", "Run commands in its own copy"],
  brief:
    "Answer every comment Chidi left on #418, by doing it or by saying why not. Do not widen the change. Done when no comment is open and CI passes.",
  lines: LINES,
  diff: DIFF,
  files: [
    { path: "src/export/stream.ts", change: "changed" },
    { path: "src/export/stream.test.ts", change: "changed" },
  ],
};

export const CODING_THREAD: Fixture = read(
  "/m/:manager/threads/:thread",
  { manager: "coding", thread: "thread-46" },
  {
    head: head("coding"),
    thread: THREAD,
    running: { tool: "edit", target: "src/export/stream.ts" },
    touched: [
      { path: "src/export/stream.ts", says: "Read, then edited: +14 −9" },
      { path: "src/export/stream.test.ts", says: "Run twice: one failed, then 18 passed" },
    ],
    work: { id: "ACME-412", title: "Export drops rows over 150k" },
  },
);

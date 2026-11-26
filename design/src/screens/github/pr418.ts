/* Pull request #418 and the issue it closes: the one with the review, as in TASK and TRACE (world.ts). */
import type { Check, Entry, FileChange, Thread } from "./data";

const J = (id: string, at: string, body: string[]): Entry => ({ kind: "comment", id, by: "Juno", at, body, mine: true });

export const E412: readonly Entry[] = [
  { kind: "comment", id: "a1", by: "Chidi Okafor", at: "24 Nov, 09:07", body: ["Exports over 150,000 rows finish without an error, but the file is short. Northwind exports 212,000 rows every Monday, and noticed.", "Looks like memory."] },
  J("a2", "24 Nov, 09:12", ["Taking it as ACME-412. Done means: an export of 212,000 rows has every row, memory stays under 128 MB, and the docs stop naming a limit."]),
  { kind: "event", id: "a3", at: "24 Nov, 09:14", text: "Juno found the cause: the export is built in memory and cut at 128 MB." },
  { kind: "event", id: "a4", at: "24 Nov, 10:23", text: "Juno opened pull request #418, which closes this issue." },
  { kind: "event", id: "a5", at: "24 Nov, 10:56", text: "Juno asked Chidi Okafor to review #418." },
];

export const E418: readonly Entry[] = [
  J("p1", "24 Nov, 10:23", ["Streams the rows from the database to the file in pages of 5,000, so memory does not grow with the size of the export.", "Closes #412. The new test fails without this change. The highest memory use for 212,000 rows was 61 MB."]),
  { kind: "event", id: "p2", at: "24 Nov, 10:40", text: "A fresh Juno checked it against the done-when and asked for a test on an empty export." },
  { kind: "event", id: "p3", at: "24 Nov, 10:56", text: "Juno requested a review from Chidi Okafor." },
  { kind: "review", id: "p4", by: "Chidi Okafor", at: "25 Nov, 09:41", verdict: "asked for changes", body: "Good change. Three things on the code.", threads: ["t1", "t2", "t3"] },
  { kind: "event", id: "p5", at: "25 Nov, 09:53", text: "Juno pushed 4f21c9a: the page size is a constant, and pages go by id." },
];

export const THREADS_418: readonly Thread[] = [
  { id: "t1", file: "src/export/stream.ts", line: 41, answered: true,
    hunk: " export async function* pages(db: Db) {\n   let offset = 0;\n   for (;;) {\n+    const rows = await db.page({ offset, limit: 5000 });\n     if (rows.length === 0) break;",
    comments: [{ by: "Chidi Okafor", at: "09:41", body: "Can the page size be a constant? 5000 is in two places." }, { by: "Juno", at: "09:53", body: "Done in 4f21c9a.", mine: true }] },
  { id: "t2", file: "src/export/stream.ts", line: 66, answered: true,
    hunk: "     if (rows.length === 0) break;\n     offset += rows.length;\n+    await file.write(rows);\n+    await release(rows);\n   }",
    comments: [{ by: "Chidi Okafor", at: "09:41", body: "What if a row is deleted between pages?" }, { by: "Juno", at: "09:54", body: "You’re right, it missed a row. Now pages by id, with a test.", mine: true }] },
  { id: "t3", file: "src/export/stream.ts", line: 88, answered: false,
    hunk: " export async function exportRows(db: Db, file: Sink) {\n+  const cursor = db.open();\n+  for await (const rows of pages(cursor)) await file.write(rows);\n+  cursor.close();\n }",
    comments: [{ by: "Chidi Okafor", at: "09:41", body: "Close the cursor on error too." }] },
];

export const CHECKS_418: readonly Check[] = [
  { name: "CI / test", result: "passed", took: "3 min 12 s", what: "18 tests" },
  { name: "CI / typecheck", result: "passed", took: "48 s", what: "No errors" },
  { name: "CI / lint", result: "passed", took: "21 s", what: "No warnings" },
  { name: "export-large", result: "passed", took: "1 min 40 s", what: "212,000 rows, 61 MB at most" },
];

export const FILES_418: readonly FileChange[] = [
  { path: "src/export/stream.ts", added: 112, removed: 0, patch: "@@ -0,0 +36,10 @@\n+export async function* pages(db: Db) {\n+  let lastId = 0;\n+  for (;;) {\n+    const rows = await db.page({ after: lastId, limit: PAGE });\n+    if (rows.length === 0) break;\n+    lastId = rows[rows.length - 1].id;\n+    yield rows;\n+  }\n+}" },
  { path: "src/export/index.ts", added: 6, removed: 31, patch: "@@ -12,9 +12,4 @@\n-const all = await db.all();\n-const text = all.map(toCsv).join(\"\\n\");\n-await file.write(text);\n+await exportRows(db, file);" },
  { path: "src/export/stream.test.ts", added: 84, removed: 0, patch: "@@ -0,0 +1,6 @@\n+test(\"an export of 212,000 rows has every row\", async () => {\n+  const out = await run(rows(212_000));\n+  expect(out.count).toBe(212_000);\n+});" },
  { path: "docs/export.md", added: 0, removed: 3, patch: "@@ -8,6 +8,3 @@\n-Exports over 150,000 rows are cut off.\n-Split the export by date to get every row.\n-This limit will be lifted." },
];

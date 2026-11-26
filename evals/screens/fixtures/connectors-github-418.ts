import { ITEM_418 } from "./connectors-github-kit.ts";
import { inn, note, out } from "./connectors-kit.ts";
import { at, read, type Fixture } from "./read.ts";

/* Pull request #418 open beside the list: its conversation, the review on its lines, its checks and its files. */

const COMMENT = (
  id: string,
  file: string,
  line: number,
  hunk: string,
  done: boolean,
  ask: string,
  askAt: string,
  reply: string,
  replyAt: string | null,
) => ({
  id,
  path: file,
  line,
  hunk,
  done,
  stream: [
    inn(`${id}-1`, `25 Nov ${askAt}`, "Chidi Okafor", "github:chidi", ask),
    ...(replyAt === null ? [] : [out(`${id}-2`, `25 Nov ${replyAt}`, "Juno", reply)]),
  ],
});
const FILE = "src/export/stream.ts";

export const GITHUB_418: Fixture = read(
  "/m/:manager/connectors/github/:number",
  { manager: "coding", number: "418" },
  {
    item: ITEM_418,
    thread: "thread-46",
    body: "Streams the rows from the database to the file in pages of 5,000, so memory does not grow with the size of the export.\n\nCloses #412. The new test fails without this change. The highest memory use for 212,000 rows was 61 MB.",
    stream: [
      note("p2", "24 Nov 10:40", "A fresh Juno checked it against the done-when and asked for a test on an empty export."),
      note("p3", "24 Nov 10:56", "Juno requested a review from Chidi Okafor."),
      {
        id: "p4",
        at: at("25 Nov 09:41"),
        is: "review",
        by: "Chidi Okafor",
        verdict: "asked for changes",
        text: "Good change. Three things on the code.",
        comments: ["t1", "t2", "t3"],
      },
      note("p5", "25 Nov 09:53", "Juno pushed 4f21c9a: the page size is a constant, and pages go by id."),
    ],
    comments: [
      COMMENT(
        "t1",
        FILE,
        41,
        " export async function* pages(db: Db) {\n   let offset = 0;\n   for (;;) {\n+    const rows = await db.page({ offset, limit: 5000 });\n     if (rows.length === 0) break;",
        true,
        "Can the page size be a constant? 5000 is in two places.",
        "09:41",
        "Done in 4f21c9a.",
        "09:53",
      ),
      COMMENT(
        "t2",
        FILE,
        66,
        "     if (rows.length === 0) break;\n     offset += rows.length;\n+    await file.write(rows);\n+    await release(rows);\n   }",
        true,
        "What if a row is deleted between pages?",
        "09:41",
        "You’re right, it missed a row. Now pages by id, with a test.",
        "09:54",
      ),
      COMMENT(
        "t3",
        FILE,
        88,
        " export async function exportRows(db: Db, file: Sink) {\n+  const cursor = db.open();\n+  for await (const rows of pages(cursor)) await file.write(rows);\n+  cursor.close();\n }",
        false,
        "Close the cursor on error too.",
        "09:41",
        "",
        null,
      ),
    ],
    checks: [
      { name: "CI / test", is: "passed", says: "18 tests", took: 192_000, link: "/m/coding/connectors/github/418/checks/test" },
      { name: "CI / typecheck", is: "passed", says: "No errors", took: 48_000, link: "/m/coding/connectors/github/418/checks/typecheck" },
      { name: "CI / lint", is: "passed", says: "No warnings", took: 21_000, link: "/m/coding/connectors/github/418/checks/lint" },
      {
        name: "export-large",
        is: "passed",
        says: "212,000 rows, 61 MB at most",
        took: 100_000,
        link: "/m/coding/connectors/github/418/checks/export-large",
      },
    ],
    files: [
      {
        path: FILE,
        added: 112,
        gone: 0,
        patch:
          "@@ -0,0 +36,10 @@\n+export async function* pages(db: Db) {\n+  let lastId = 0;\n+  for (;;) {\n+    const rows = await db.page({ after: lastId, limit: PAGE });\n+    if (rows.length === 0) break;\n+    lastId = rows[rows.length - 1].id;\n+    yield rows;\n+  }\n+}",
      },
      {
        path: "src/export/index.ts",
        added: 6,
        gone: 31,
        patch:
          '@@ -12,9 +12,4 @@\n-const all = await db.all();\n-const text = all.map(toCsv).join("\\n");\n-await file.write(text);\n+await exportRows(db, file);',
      },
      {
        path: "src/export/stream.test.ts",
        added: 84,
        gone: 0,
        patch:
          '@@ -0,0 +1,6 @@\n+test("an export of 212,000 rows has every row", async () => {\n+  const out = await run(rows(212_000));\n+  expect(out.count).toBe(212_000);\n+});',
      },
      {
        path: "docs/export.md",
        added: 0,
        gone: 3,
        patch:
          "@@ -8,6 +8,3 @@\n-Exports over 150,000 rows are cut off.\n-Split the export by date to get every row.\n-This limit will be lifted.",
      },
    ],
  },
);

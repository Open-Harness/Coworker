/**
 * Writes the build dashboard's data: every eval in docs/build-plan.md with its latest result from
 * status/score.json (or "missing" when there is none yet), and the score history.
 * Output: status/dashboard/evals.json and status/dashboard/runs.json, each `{ rows, meta }`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { score } from "../src/modules/score/service.ts";
import type { ScoreFile } from "../src/modules/score/types.ts";

const book = score.parseBook(readFileSync("docs/build-plan.md", "utf8"));
if (!Array.isArray(book)) throw new Error(`The book is broken: ${JSON.stringify(book)}`);
const file: Partial<ScoreFile> = existsSync("status/score.json")
  ? (JSON.parse(readFileSync("status/score.json", "utf8")) as ScoreFile)
  : {};
const results = file.evals ?? {};

const rows = book.map((entry) => ({ ...entry, status: results[entry.id] ?? "missing" }));
const input =
  "docs/build-plan.md" + (file.evals === undefined ? " (no status/score.json yet: every eval is missing)" : ", status/score.json");
const meta = [
  { label: "scripts/dashboard-data.ts", value: readFileSync(new URL(import.meta.url), "utf8"), type: "code", lang: "typescript" },
  { label: "Input", value: input },
];
mkdirSync("status/dashboard", { recursive: true });
writeFileSync("status/dashboard/evals.json", JSON.stringify({ rows, meta }, null, 1));
writeFileSync("status/dashboard/runs.json", JSON.stringify({ rows: file.history ?? [], meta: meta.slice(1) }, null, 1));
const pass = rows.filter((row) => row.status === "pass").length;
console.log(`${rows.length} evals, ${pass} pass. Wrote status/dashboard/evals.json and runs.json.`);

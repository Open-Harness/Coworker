/**
 * Writes the progress dashboard's data from the climb itself: every eval in docs/book.md, its slice and tier, and its
 * latest result, plus the score history of status/climb.json and the log of what was done.
 *
 *   node scripts/progress.ts                 runs the rules and the flows, keeps the last result of the rest
 *   node scripts/progress.ts --tiers rules   only those tiers (rules, flow, screen)
 *
 * Output, each `{ rows, meta }`: status/dashboard/evals.json, runs.json, log.json.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ofTier, run } from "../evals/climb/run.ts";
import { SLICES, sliceOf, tierOf, type Tier } from "../evals/climb/slices.ts";

interface Row {
  readonly id: string;
  readonly module: string;
  readonly slice: number;
  readonly sliceName: string;
  readonly tier: Tier;
  readonly status: "pass" | "fail" | "not run";
  readonly why: string;
  readonly checkedAt: string;
}

const DIR = "status/dashboard";
const at = new Date().toISOString();
const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).stdout.trim();
const tiersArg = process.argv.includes("--tiers") ? process.argv[process.argv.indexOf("--tiers") + 1] : undefined;
const tiers = (tiersArg ?? "rules,flow").split(",") as Tier[];

const read = (path: string): unknown => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});
const ids = [...readFileSync("docs/book.md", "utf8").matchAll(/^\| `((?:rules|flow|screen|jobs):[^`]+)` \|/gmu)].map(([, id = ""]) => id);
const before = new Map(((read(`${DIR}/evals.json`) as { rows?: Row[] }).rows ?? []).map((row) => [row.id, row]));

const fresh = new Map(tiers.flatMap((tier) => run(tier, ofTier(ids, tier), false)).map((one) => [one.id, one]));
const rows: Row[] = ids.map((id) => {
  const slice = sliceOf(id);
  const ran = fresh.get(id);
  const last = before.get(id);
  const base = { id, module: id.split(":")[1]?.split("/")[0] ?? "", slice: slice?.n ?? 0, sliceName: slice?.name ?? "", tier: tierOf(id) };
  if (ran !== undefined) return { ...base, status: ran.passed ? "pass" : "fail", why: ran.passed ? "" : ran.why, checkedAt: at };
  return { ...base, status: last?.status ?? "not run", why: last?.why ?? "", checkedAt: last?.checkedAt ?? "" };
});

const meta = [
  { label: "scripts/progress.ts", value: readFileSync(new URL(import.meta.url), "utf8"), type: "code", lang: "typescript" },
  { label: "Input", value: `docs/book.md, evals/climb (tiers run: ${tiers.join(", ")}), status/climb.json at ${commit}` },
];
const climb = read("status/climb.json") as { history?: unknown[] };
const log = (read(`${DIR}/log.json`) as { rows?: unknown[] }).rows ?? [];
const slices = SLICES.map(({ n, name, done }) => ({ n, name, done }));

mkdirSync(DIR, { recursive: true });
writeFileSync(`${DIR}/evals.json`, `${JSON.stringify({ rows, meta }, null, 1)}\n`);
writeFileSync(`${DIR}/runs.json`, `${JSON.stringify({ rows: climb.history ?? [], meta: meta.slice(1) }, null, 1)}\n`);
writeFileSync(`${DIR}/slices.json`, `${JSON.stringify({ rows: slices, meta: meta.slice(1) }, null, 1)}\n`);
if (!existsSync(`${DIR}/log.json`)) writeFileSync(`${DIR}/log.json`, `${JSON.stringify({ rows: log, meta: [] }, null, 1)}\n`);
const pass = rows.filter((row) => row.status === "pass").length;
process.stdout.write(`${rows.length} evals, ${pass} pass, at ${commit}. Wrote ${DIR}/.\n`);

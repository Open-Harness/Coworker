/*
 * pnpm climb                 the gates that are quick, the rules, the flows. What is red, in the order to build it
 * pnpm climb --slice 3       only that slice's evals, every tier but the jobs
 * pnpm climb --only <words>  only evals whose id has these words
 * pnpm climb --all           everything: the gates, the rules, the flows, the screens, the kept tests. This is the score
 * pnpm climb --jobs          the jobs too, with your JOBS_BASE_URL, JOBS_KEY and JOBS_MODEL. Costs money
 * pnpm climb --lock          whether anything that is locked was changed
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { broken, lockHash } from "./lock.ts";
import { kept, ofTier, run, type Ran } from "./run.ts";
import { SLICES, sliceOf, tierOf, WEIGHTS, type Tier } from "./slices.ts";

const flag = (name: string): boolean => process.argv.includes(`--${name}`);
const value = (name: string): string | undefined => (flag(name) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);
const say = (text: string): void => void process.stdout.write(`${text}\n`);

const changed = broken();
if (changed.length > 0) {
  say(`LOCKED FILES WERE CHANGED. Nothing is scored until they are as they were:\n  ${changed.join("\n  ")}`);
  process.exit(2);
}
if (flag("lock")) {
  say(`Nothing that is locked was changed. ${lockHash()}`);
  process.exit(0);
}

const ids = [...readFileSync("docs/book.md", "utf8").matchAll(/^\| `((?:rules|flow|screen|jobs):[^`]+)` \|/gmu)].map(([, id = ""]) => id);
const [slice, only] = [value("slice"), value("only")];
const some = slice !== undefined || only !== undefined;
const asked = ids.filter((id) => (slice === undefined || sliceOf(id)?.n === Number(slice)) && (only === undefined || id.includes(only)));
const tiers: readonly Tier[] = (["rules", "flow", "screen", "jobs"] as const).filter(
  (tier) => ofTier(asked, tier).length > 0 && (tier === "jobs" ? flag("jobs") : tier === "screen" ? flag("all") || some : true),
);

const problems: string[] = [];
const gate = (name: string, args: readonly string[]): void => {
  const ran = spawnSync("pnpm", ["--silent", ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (ran.status !== 0) problems.push(`${name}: ${`${ran.stdout}${ran.stderr}`.trim().split("\n").slice(0, 3).join(" / ").slice(0, 400)}`);
};
gate("types", ["typecheck"]);
gate("shape", ["check:shape"]);
if (flag("all")) for (const [name, script] of [["lint", "lint"], ["format", "format:check"], ["ui", "check:ui"], ["size", "check:size"], ["build", "build"]] as const) gate(name, [script]);
else if (tiers.includes("screen")) gate("build", ["build"]);

const results: Ran[] = tiers.flatMap((tier) => [...run(tier, ofTier(asked, tier), some)]);
if (flag("all")) problems.push(...kept().map((text) => `a kept test broke: ${text}`));

const FILE = "status/climb.json";
interface Kept {
  readonly best: Readonly<Record<string, string>>;
  readonly history: readonly { readonly at: string; readonly commit: string; readonly score: number; readonly pass: number; readonly of: number }[];
}
const before: Kept = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, "utf8")) as Kept) : { best: {}, history: [] };
const commit = spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).stdout.trim();
const lost = results.filter(({ id, passed }) => !passed && before.best[id] !== undefined);
const best = { ...before.best, ...Object.fromEntries(results.filter(({ passed }) => passed).map(({ id }) => [id, before.best[id] ?? commit])) };

const weight = (id: string): number => WEIGHTS[tierOf(id)];
const sum = (all: readonly string[]): number => all.reduce((total, id) => total + weight(id), 0);
const counted = flag("all") ? ids.filter((id) => tierOf(id) !== "jobs" || flag("jobs")) : results.map(({ id }) => id);
const passed = new Set(results.filter((one) => one.passed).map(({ id }) => id));
const score = counted.length === 0 ? 0 : Math.round((1000 * sum(counted.filter((id) => passed.has(id)))) / sum(counted)) / 10;

say(`\n${flag("all") ? "Score" : "Of what was run"}: ${score} of 100. ${[...passed].length} of ${counted.length} evals.`);
for (const one of SLICES) {
  const mine = results.filter(({ id }) => sliceOf(id)?.n === one.n);
  if (mine.length > 0) say(`  ${String(one.n).padStart(2)}. ${one.name.padEnd(36)} ${mine.filter((ran) => ran.passed).length} of ${mine.length}`);
}
if (problems.length > 0) say(`\nThese come first:\n  ${problems.join("\n  ")}`);
if (lost.length > 0) say(`\nThese were green and are red now:\n  ${lost.map(({ id, why }) => `${id}  ${why}`).join("\n  ")}`);
const red = results.filter((one) => !one.passed).toSorted((a, b) => (sliceOf(a.id)?.n ?? 99) - (sliceOf(b.id)?.n ?? 99));
if (red.length > 0) say(`\nNext:\n  ${red.slice(0, 8).map(({ id, why }) => `${id}\n      ${why}`).join("\n  ")}`);

const row = { at: new Date().toISOString(), commit, score, pass: passed.size, of: counted.length };
writeFileSync(FILE, `${JSON.stringify({ best, history: flag("all") ? [...before.history, row] : before.history }, null, 2)}\n`);
process.exit(problems.length > 0 || lost.length > 0 ? 1 : 0);

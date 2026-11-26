/**
 * `pnpm score [--ui] [--live]`: runs the gates and the tests, judges them against the book, writes status/score.json and
 * prints passing evals per milestone. Exits 1 on any problem: a red gate, an eval the book lacks, an id two tests
 * use, or a regression. The composition root for the score module.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { live } from "../modules/live/service.ts";
import { score } from "../modules/score/service.ts";
import { liveSettings } from "./live-settings.ts";
import type { Result, ScoreFile, TestOutcome, Tier } from "../modules/score/types.ts";

const GATES: readonly (readonly [string, string])[] = [
  ["typecheck", "typecheck"],
  ["lint", "lint"],
  ["format", "format:check"],
  ["shape", "check:shape"],
  ["ui", "check:ui"],
  ["size", "check:size"],
];
const SCORE_FILE = "status/score.json";

const quiet = (command: string, args: readonly string[], env: NodeJS.ProcessEnv = process.env) =>
  spawnSync(command, args, { encoding: "utf8", env, maxBuffer: 64 * 1024 * 1024 });

function readJson(path: string): unknown {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

function previousScore(): ScoreFile | undefined {
  const raw = readJson(SCORE_FILE);
  if (typeof raw !== "object" || raw === null || !("evals" in raw) || !("history" in raw)) return undefined;
  return raw as ScoreFile;
}

function git(...args: string[]): string | undefined {
  const result = quiet("git", args);
  return result.status === 0 ? result.stdout.trim() : undefined;
}

function spikeResult(id: string): Result {
  const path = `docs/spikes/${id.replace(/^spike:/u, "").replaceAll("/", "-")}.md`;
  if (!existsSync(path)) return "missing";
  return /^Accepted by Aaron\b/mu.test(readFileSync(path, "utf8")) ? "pass" : "fail";
}

const tiers: Tier[] = ["fast"];
if (process.argv.includes("--ui")) tiers.push("ui");
if (process.argv.includes("--live")) tiers.push("live");

const bookText = readFileSync("docs/old/build-plan.md", "utf8");
const book = score.parseBook(bookText);
if (!Array.isArray(book)) {
  console.error(`The book is broken: ${JSON.stringify(book)}`);
  process.exit(1);
}

const redGates: string[] = [];
for (const [name, script] of GATES) {
  const run = quiet("pnpm", ["run", "--silent", script]);
  console.log(`${run.status === 0 ? "✓" : "✗"} ${name}`);
  if (run.status !== 0) {
    redGates.push(name);
    console.error((run.stdout + run.stderr).trim().split("\n").slice(-15).join("\n"));
  }
}

mkdirSync("status", { recursive: true });
const outcomes: TestOutcome[] = [];
quiet("pnpm", ["exec", "vitest", "--run", "--reporter=json", "--outputFile=status/.vitest.json"]);
outcomes.push(...score.readVitest(readJson("status/.vitest.json")));
if (tiers.includes("ui")) {
  const build = quiet("pnpm", ["run", "--silent", "build"]);
  if (build.status !== 0) redGates.push("build");
  else {
    quiet("pnpm", ["exec", "playwright", "test", "--reporter=json"], {
      ...process.env,
      PLAYWRIGHT_JSON_OUTPUT_NAME: "status/.playwright.json",
    });
    outcomes.push(...score.readPlaywright(readJson("status/.playwright.json")));
  }
}
if (tiers.includes("live")) {
  // Staging, from outside. Tests whose settings are missing are skipped: never a pass, never a fail, and named here.
  for (const { id, missing } of live.skipped(liveSettings())) console.log(`- skipped ${id}: missing ${missing.join(", ")}`);
  quiet("pnpm", [
    "exec",
    "vitest",
    "--run",
    "--config",
    "vitest.live.config.ts",
    "--reporter=json",
    "--outputFile=status/.vitest-live.json",
  ]);
  outcomes.push(...score.readVitest(readJson("status/.vitest-live.json")));
}
const brokenSupport = score.brokenSupport(outcomes);
if (brokenSupport.length > 0) {
  redGates.push("tests");
  console.error(`✗ tests: ${brokenSupport.map((outcome) => outcome.name).join(", ")}`);
} else console.log("✓ tests");

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
const hasMain = git("rev-parse", "--verify", "--quiet", "refs/heads/main") !== undefined;
const computed: Record<string, Result> = {
  "gate:repo": branch !== undefined && hasMain && redGates.length === 0 ? "pass" : "fail",
  "gate:size": redGates.includes("size") ? "fail" : "pass",
};
for (const entry of book) if (entry.kind === "spike") computed[entry.id] = spikeResult(entry.id);

const report = score.judge({
  book,
  outcomes,
  computed,
  tiersRun: tiers,
  redGates,
  previous: previousScore(),
  at: new Date().toISOString(),
  commit: git("rev-parse", "--short", "HEAD"),
});
writeFileSync(SCORE_FILE, `${JSON.stringify(report.file, null, 1)}\n`);
console.log(`\n${score.table(report)}`);
for (const problem of report.problems) console.error(`✗ ${score.describeProblem(problem)}`);
process.exit(report.problems.length === 0 ? 0 : 1);

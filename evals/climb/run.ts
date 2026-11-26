import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { tierOf, type Tier } from "./slices.ts";

/* Runs a tier and reads what came out: each eval's id, whether it passed, and the first thing that went wrong. */

export interface Ran {
  readonly id: string;
  readonly passed: boolean;
  readonly why: string;
}
const OUT = ".climb";
const ID = /^(?:rules|flow|screen|jobs):\S+$/u;
const first = (text: string): string =>
  text
    // eslint-disable-next-line no-control-regex
    .replaceAll(/\u001b\[[0-9;]*m/gu, "")
    .split("\n")
    .find((line) => line.trim() !== "")
    ?.slice(0, 400) ?? "";

type Vitest = { readonly testResults?: readonly { readonly name: string; readonly message?: string; readonly assertionResults: readonly { readonly title: string; readonly status: string; readonly failureMessages?: readonly string[] }[] }[] };
type Spec = { readonly title: string; readonly ok: boolean; readonly tests: readonly { readonly results: readonly { readonly error?: { readonly message?: string } }[] }[] };
type Suite = { readonly specs?: readonly Spec[]; readonly suites?: readonly Suite[] };

const file = (path: string): unknown => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {});
const escaped = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\/]/gu, "\\$&");

function vitest(config: string, name: string, ids: readonly string[] | null): readonly Ran[] {
  const out = `${OUT}/${name}.json`;
  const only = ids === null ? [] : ["-t", ids.map(escaped).join("|")];
  spawnSync("node_modules/.bin/vitest", ["--run", "--config", config, "--reporter=json", `--outputFile=${out}`, ...only], { stdio: ["ignore", "ignore", "ignore"], maxBuffer: 1 << 28 });
  const { testResults = [] } = file(out) as Vitest;
  return testResults.flatMap(({ message, assertionResults }) =>
    assertionResults
      .filter(({ title, status }) => ID.test(title) && (status === "passed" || status === "failed"))
      .map(({ title, status, failureMessages }) => ({ id: title, passed: status === "passed", why: first(failureMessages?.[0] ?? message ?? "") })),
  );
}
function playwright(ids: readonly string[] | null): readonly Ran[] {
  const out = `${OUT}/screen.json`;
  const only = ids === null ? [] : ["-g", ids.map(escaped).join("|")];
  spawnSync("node_modules/.bin/playwright", ["test", "--config", "evals/screens/playwright.config.ts", "--reporter=json", ...only], { env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: `../../${out}` }, stdio: "ignore" });
  const all = (suite: Suite): readonly Spec[] => [...(suite.specs ?? []), ...(suite.suites ?? []).flatMap(all)];
  return all(file(out) as Suite).map(({ title, ok, tests }) => ({ id: title, passed: ok, why: first(tests[0]?.results[0]?.error?.message ?? "") }));
}

const CONFIG: Readonly<Record<Exclude<Tier, "screen">, string>> = { rules: "evals/rules/vitest.config.ts", flow: "evals/flows/vitest.config.ts", jobs: "evals/jobs/vitest.config.ts" };

/** Runs one tier, all of it or only `ids`. An eval that did not run at all is red, and says so. */
export function run(tier: Tier, wanted: readonly string[], some: boolean): readonly Ran[] {
  mkdirSync(OUT, { recursive: true });
  const ids = some ? wanted : null;
  const ran = tier === "screen" ? playwright(ids) : vitest(CONFIG[tier], tier, ids);
  const got = new Map<string, Ran>();
  for (const one of ran) {
    const before = got.get(one.id);
    // An id may have a case each: it passes when all do.
    got.set(one.id, before === undefined || before.passed ? one : before);
  }
  return wanted.map((id) => got.get(id) ?? { id, passed: false, why: "It did not run: the file does not load, or nothing has this name" });
}
export const ofTier = (ids: readonly string[], tier: Tier): readonly string[] => ids.filter((id) => tierOf(id) === tier);

/** The tests of what is kept of `src`, as they were: each file's titles that passed on the day the evals were locked. */
export function kept(): readonly string[] {
  const was = JSON.parse(readFileSync("evals/climb/kept.json", "utf8")) as Readonly<Record<string, readonly string[]>>;
  const passing = passingIn(Object.keys(was));
  return Object.entries(was).flatMap(([path, titles]) => titles.filter((title) => !passing.has(`${path} ${title}`)).map((title) => `${path}: ${title}`));
}
export function passingIn(files: readonly string[]): ReadonlySet<string> {
  mkdirSync(OUT, { recursive: true });
  spawnSync("node_modules/.bin/vitest", ["--run", "--reporter=json", `--outputFile=${OUT}/kept.json`, ...files], { stdio: "ignore", maxBuffer: 1 << 28 });
  const { testResults = [] } = file(`${OUT}/kept.json`) as Vitest;
  return new Set(testResults.flatMap(({ name, assertionResults }) => assertionResults.filter(({ status }) => status === "passed").map(({ title }) => `${name.slice(name.indexOf("src/"))} ${title}`)));
}

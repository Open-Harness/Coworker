/*
 * node evals/climb/book.ts   Writes docs/book.md from the evals there are, and evals/climb/kept.json, and evals/LOCK. The owner
 * runs it when an eval is added or retired; whoever builds does not (it is all locked).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { locked, lockHash } from "./lock.ts";
import { passingIn } from "./run.ts";
import { NOT_SHOWN, says, SLICES, sliceOf, tierOf } from "./slices.ts";

mkdirSync(".climb", { recursive: true });
const named = (tier: "rules" | "flows" | "jobs"): readonly string[] => {
  const out = `.climb/names-${tier}.json`;
  spawnSync("node_modules/.bin/vitest", ["--run", "--config", `evals/${tier}/vitest.config.ts`, "--reporter=json", `--outputFile=${out}`], { env: { ...process.env, JOBS_KEY: "" }, stdio: "ignore", maxBuffer: 1 << 28 });
  const { testResults } = JSON.parse(readFileSync(out, "utf8")) as { testResults: readonly { assertionResults: readonly { title: string }[] }[] };
  return testResults.flatMap(({ assertionResults }) => assertionResults.map(({ title }) => title));
};
const drawn = (): readonly string[] => {
  const listed = spawnSync("node_modules/.bin/playwright", ["test", "--config", "evals/screens/playwright.config.ts", "--list"], { encoding: "utf8", maxBuffer: 1 << 26 });
  return [...listed.stdout.matchAll(/ (screen:\S+)$/gmu)].map(([, id = ""]) => id);
};
const ids = [...new Set([...named("rules"), ...named("flows"), ...drawn(), ...named("jobs")])];
const homeless = ids.filter((id) => sliceOf(id) === undefined);
if (homeless.length > 0) throw new Error(`No slice has: ${homeless.join(", ")}`);

const sentences = [...readFileSync("docs/spec.md", "utf8").matchAll(/^- \*\*([A-Z]\d+)\*\*/gmu)].map(([, id = ""]) => id);
const shown = new Set(
  ids.flatMap((id) =>
    [...says(id).matchAll(/([A-Z])(\d+)(?: to [A-Z](\d+))?/gu)].flatMap(([, letter = "", from = "0", to = from]) =>
      Array.from({ length: Number(to) - Number(from) + 1 }, (_, n) => `${letter}${Number(from) + n}`),
    ),
  ),
);
const bare = sentences.filter((id) => !shown.has(id) && !(id in NOT_SHOWN));
if (bare.length > 0) throw new Error(`No eval shows: ${bare.join(", ")}`);

const head = readFileSync("evals/climb/head.md", "utf8");
const part = (n: number): string => {
  const slice = SLICES.find((one) => one.n === n);
  const mine = ids.filter((id) => sliceOf(id)?.n === n);
  return `### ${n}. ${slice?.name}\n\n${slice?.done}\n\n| Eval | Shows |\n|---|---|\n${mine.map((id) => `| \`${id}\` | ${says(id)} |`).join("\n")}\n`;
};
const count = (tier: string): number => ids.filter((id) => tierOf(id) === tier).length;
const counts = `| Tier | Evals | Counts | Runs in |\n|---|---|---|---|\n| rules | ${count("rules")} | 1 each | seconds |\n| flows | ${count("flow")} | 3 each | minutes |\n| screens | ${count("screen")} | 2 each | minutes |\n| jobs | ${count("jobs")} | 5 each | a key, and money |`;
const not = Object.entries(NOT_SHOWN).map(([id, why]) => `| ${id} | ${why} |`).join("\n");
writeFileSync("docs/book.md", `${head.replace("{{counts}}", counts).replace("{{not shown}}", not)}\n## The evals, in the order to build\n\n${SLICES.map(({ n }) => part(n)).join("\n")}`);

if (process.argv.includes("--kept")) {
  const { files, not } = JSON.parse(readFileSync("evals/climb/kept-files.json", "utf8")) as { files: readonly string[]; not: readonly string[] };
  const passing = passingIn(files);
  const titles = (file: string): readonly string[] => [...passing].filter((one) => one.startsWith(`${file} `)).map((one) => one.slice(file.length + 1)).filter((title) => !not.includes(title));
  writeFileSync("evals/climb/kept.json", `${JSON.stringify(Object.fromEntries(files.map((file) => [file, titles(file)])), null, 2)}\n`);
}
writeFileSync("evals/LOCK", locked());
process.stdout.write(`${ids.length} evals. LOCK ${lockHash()}\n`);

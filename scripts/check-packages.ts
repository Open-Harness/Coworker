import { globSync, readFileSync } from "node:fs";

/**
 * Who may import whom across the workspace's packages (docs/blueprint-light/layout.md). Effect and Orthograph stay inside the
 * blueprint packages; the component library imports nothing of ours; the SDK sees the blueprint only as types. Prints every
 * break and exits 1.
 */
const VENDORED = /^packages\/orthograph\//u;
const BLUEPRINT = /^packages\/blueprint(-delta)?\//u;
const UI = /^packages\/ui\//u;
const SDK = /^packages\/sdk\//u;
const IMPORT = /^\s*(import|export)\s+(type\s+)?[^"';]*?from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gmu;

const problems: string[] = [];
const files = globSync("{src,scripts,test,live,evals,packages}/**/*.{ts,tsx}").filter((file) => !VENDORED.test(file));
for (const file of files) {
  for (const match of readFileSync(file, "utf8").matchAll(IMPORT)) {
    const typeOnly = match[2] !== undefined;
    const target = match[3] ?? match[4] ?? "";
    const effectOrOrthograph =
      target === "effect" || target.startsWith("effect/") || target === "orthograph" || target.startsWith("orthograph/");
    if (effectOrOrthograph && !BLUEPRINT.test(file)) problems.push(`${file}: imports ${target}; only the blueprint packages may`);
    if (UI.test(file) && (target.startsWith("@coworker/") || target.startsWith("~/")))
      problems.push(`${file}: the component library imports ${target}`);
    if (SDK.test(file) && target.startsWith("@coworker/blueprint") && !typeOnly)
      problems.push(`${file}: the SDK imports the blueprint as a value`);
    if (target.startsWith("@coworker/blueprint") && !SDK.test(file) && !BLUEPRINT.test(file))
      problems.push(`${file}: imports ${target}; only the SDK may`);
  }
}
for (const problem of problems) console.error(problem);
console.log(problems.length === 0 ? "Every package imports only what it may" : `${problems.length} imports across a boundary`);
process.exit(problems.length === 0 ? 0 : 1);

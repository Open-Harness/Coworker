import { globSync, readFileSync } from "node:fs";

/** No source file over 250 lines, anywhere in the repo's own code. Prints every break and exits 1. */
const MAX_LINES = 250;
const GENERATED = /routeTree\.gen\.ts$/u;

const problems: string[] = [];
for (const file of globSync("{src,scripts,test,live}/**/*.{ts,tsx}")) {
  if (GENERATED.test(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n").length;
  if (lines > MAX_LINES) problems.push(`${file}: ${lines} lines; at most ${MAX_LINES}`);
}
for (const problem of problems) console.error(problem);
console.log(problems.length === 0 ? "Every file is 250 lines or fewer" : `${problems.length} files too long`);
process.exit(problems.length === 0 ? 0 : 1);

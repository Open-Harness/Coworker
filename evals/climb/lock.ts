import { createHash } from "node:crypto";
import { globSync, readFileSync } from "node:fs";

/* What whoever builds may not change. `evals/LOCK` has a line per file; the hash of that file is in the prompt. */

export const CONTRACT = [
  "reach", "playbook", "templates", "intake", "work", "choosing", "measures", "trials", "walkthrough", "asks", "knowledge", "doings", "connectors", "github-events", "mail-events", "threads", "boxes", "tree",
  "coworker", "mcp", "views-workspace", "views-manager", "views-connector", "api",
] as const;
const HELD = [
  "evals/**/*.{ts,md,json}",
  "evals/rules/data/real/mail/*",
  "design/**/*.{ts,tsx,css,html,mjs,md,txt}",
  "docs/spec.md",
  "docs/book.md",
  "docs/design.md",
  "docs/first-principles.md",
  "docs/templates/{repo,customers}/**/*.{md,yaml}",
  "src/modules/boxes/testing.ts",
  "src/modules/github-events/records.ts",
  "src/modules/views-*/{types,playbooks,settings}.ts",
  ...CONTRACT.map((name) => `src/modules/${name}/types.ts`),
];
const sha = (text: string | Buffer): string => createHash("sha256").update(text).digest("hex");

export function locked(): string {
  const files = [...new Set(HELD.flatMap((glob) => globSync(glob)))].filter((file) => !/\/(?:dist|shots|node_modules|test-results)\//u.test(file)).toSorted();
  return `${files.map((file) => `${sha(readFileSync(file))}  ${file}`).join("\n")}\n`;
}
export function broken(): readonly string[] {
  const was = new Map(readFileSync("evals/LOCK", "utf8").trim().split("\n").map((line) => [line.slice(66), line.slice(0, 64)] as const));
  const is = new Map(locked().trim().split("\n").map((line) => [line.slice(66), line.slice(0, 64)] as const));
  return [...new Set([...was.keys(), ...is.keys()])].filter((file) => was.get(file) !== is.get(file)).toSorted();
}
export const lockHash = (): string => sha(readFileSync("evals/LOCK"));

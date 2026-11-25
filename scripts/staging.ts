import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { liveSettings } from "../src/bin/live-settings.ts";
import { live } from "../src/modules/live/service.ts";
import type { Found, Step } from "../src/modules/live/types.ts";

/**
 * `pnpm staging` prints the steps that set up (or update) the staging deployment `coworker-staging`, and contacts nothing.
 * `pnpm credentials run pnpm staging --apply` runs them: it looks at what the account has, creates what is missing, fills
 * in the three wrangler files, deploys, and puts the files back as they were. It can be run again at any time. Secret values reach wrangler on its standard
 * input only: never as an argument, in a file, or on the screen.
 */
const flags = process.argv.slice(2);
const apply = flags.includes("--apply");
const unknown = flags.filter((flag) => flag !== "--apply");
if (unknown.length > 0) {
  console.error(`Unknown argument: ${unknown.join(" ")}. Usage: pnpm staging [--apply]`);
  process.exit(2);
}

const CONFIGS = ["wrangler.jsonc", "wrangler.fake-model.jsonc", "wrangler.mailbox.jsonc"] as const;
const settings: Readonly<Record<string, string>> = liveSettings();
const tokenEnv = settings["CLOUDFLARE_API_TOKEN"] === undefined ? {} : { CLOUDFLARE_API_TOKEN: settings["CLOUDFLARE_API_TOKEN"] };
/** What a step's own program sees: none of the secrets this one holds, except the way into Cloudflare. */
const childEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !live.settings.some((one) => one.name === name)));

const wrangler = (...args: string[]) =>
  spawnSync("pnpm", ["exec", "wrangler", ...args], { encoding: "utf8", env: { ...childEnv, ...tokenEnv, NO_COLOR: "1" } });

function lookAround(whoami: string): Found {
  const domain = live.domain(settings);
  const stores = wrangler("secrets-store", "store", "list", "--remote").stdout;
  const { storeId } = live.found({ whoami, databases: "", stores, buckets: "", secrets: "", rules: "" });
  return live.found({
    whoami,
    databases: wrangler("d1", "list", "--json").stdout,
    stores,
    buckets: wrangler("r2", "bucket", "list").stdout,
    secrets: storeId === undefined ? "" : wrangler("secrets-store", "secret", "list", storeId, "--remote", "--per-page", "100").stdout,
    rules: domain === undefined ? "" : wrangler("email", "routing", "rules", "list", domain).stdout,
  });
}

const planNow = (found: Found, signedIn: boolean) =>
  live.plan({ config: CONFIGS.map((file) => readFileSync(file, "utf8")).join("\n"), settings, signedIn, found });

function fillIn(found: Found): void {
  // Stopped with Ctrl-C, it still ends by the exit below.
  process.once("SIGINT", () => process.exit(130));
  const domain = live.domain(settings);
  for (const file of CONFIGS) {
    const text = readFileSync(file, "utf8");
    const next = live.fill(text, { domain, databaseId: found.databaseId, storeId: found.storeId, accountId: found.accountId });
    if (next === text) continue;
    // What the account has is for this run only: the files are public.
    process.once("exit", () => writeFileSync(file, text));
    writeFileSync(file, next);
  }
}

/** One value goes in as it is; several go in as JSON, which is what `wrangler secret bulk` reads. */
function inputOf(names: readonly string[]): string {
  const values = Object.fromEntries(names.map((name) => [name, settings[name] ?? ""]));
  return names.length === 1 ? (values[names[0] ?? ""] ?? "") : JSON.stringify(values);
}

function runStep(step: Extract<Step, { kind: "command" }>): void {
  console.log(`\n== ${step.title}`);
  const [program = "", ...args] = step.argv;
  const result = spawnSync(program, args, {
    stdio: [step.stdin === undefined ? "inherit" : "pipe", "inherit", "inherit"],
    ...(step.stdin === undefined ? {} : { input: inputOf(step.stdin) }),
    env: { ...childEnv, ...tokenEnv, ...step.env },
  });
  if (result.status === 0) return;
  console.error(`Stopped: "${step.title}" failed. Fix it and run this again.`);
  process.exit(result.status ?? 1);
}

if (!apply) {
  console.log(live.describe(planNow({}, true), false));
  process.exit(0);
}

const asked = wrangler("whoami");
const signedIn = asked.status === 0 && !/not authenticated/iu.test(asked.stdout);
const before = planNow(signedIn ? lookAround(asked.stdout) : {}, signedIn);
if (before.blockers.length > 0) {
  console.log(live.describe(before, true));
  process.exit(1);
}
for (const step of live.runnable(before).filter(({ phase }) => phase === "create")) runStep(step);
const found = lookAround(asked.stdout);
fillIn(found);
const plan = planNow(found, signedIn);
console.log(`\n${live.describe(plan, true)}`);
for (const step of live.runnable(plan).filter(({ phase }) => phase === "deploy")) runStep(step);
console.log("\nDone with the steps that could run now. Then do the by-hand steps.");

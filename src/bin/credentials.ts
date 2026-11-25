/**
 * `pnpm credentials`            shows which credentials are there, asks for the missing ones and keeps them in Bitwarden.
 * `pnpm credentials --list`     shows the list only.
 * `pnpm credentials run <cmd>`  runs a command with them in its environment, for that command alone.
 *
 * The composition root of the credentials module. It never prints a value.
 */
import { spawnSync } from "node:child_process";
import { createPrivateKey, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { bitwarden, createCredentials, ensureRepo, isProblem, ITEM, liveProbe } from "../modules/credentials/service.ts";
import type { Credential, Problem, Row } from "../modules/credentials/types.ts";
import { appCode, ask, open, run, unlocked } from "./credentials-terminal.ts";

const [first, ...rest] = process.argv.slice(2);
const usable = first === undefined || first === "--list" || (first === "run" && rest.length > 0);
if (!usable) stop({ _tag: "Problem", reason: "Usage: pnpm credentials [--list | run <command>]" });

const store = bitwarden(await unlocked());
const GITHUB = { accept: "application/vnd.github+json", "user-agent": "live-tests" };

const credentials = createCredentials({
  store,
  manifest: readFileSync("live/github-app-manifest.json", "utf8"),
  random: (bytes) => randomBytes(bytes).toString("base64"),
  pkcs8: (pem) => createPrivateKey(pem).export({ type: "pkcs8", format: "pem" }).toString(),
  probe: liveProbe(run, {
    github: async (token, repo) => {
      const answer = await fetch(`https://api.github.com/repos/${repo}`, { headers: { ...GITHUB, authorization: `Bearer ${token}` } });
      return answer.ok ? undefined : `GitHub answered ${answer.status}: the token does not reach ${repo}`;
    },
  }),
});

function stop(problem: Problem): never {
  console.error(problem.reason);
  process.exit(1);
}

const orStop = <T>(value: T | Problem): T => (isProblem(value) ? stop(value) : value);
const HOW: Readonly<Record<Row["source"], string>> = {
  You: "you",
  MadeHere: "made here",
  GithubApp: "the App page",
  WorkedOut: "worked out",
};

async function show(): Promise<readonly Row[]> {
  const rows = orStop(await credentials.list());
  for (const row of rows) console.log(`${row.there ? "✓" : "✗"} ${row.name.padEnd(26)} ${row.about} (${HOW[row.source]})`);
  console.log(`\n${rows.filter(({ there }) => there).length} of ${rows.length} are in Bitwarden.`);
  return rows;
}

async function askFor(one: Credential): Promise<void> {
  if (one.source._tag !== "You") return;
  console.log(`\n${one.about}\n  ${one.source.how}`);
  const page = await credentials.page(one);
  if (page !== undefined && (await ask(`  Enter opens ${new URL(page).host} in your browser, or s to not: `)).trim() !== "s") open(page);
  for (;;) {
    const typed = await ask(
      `  ${one.name}${one.source.hidden ? " (nothing shows as you paste)" : ""}, or Enter to leave it: `,
      one.source.hidden,
    );
    if (typed.trim() === "") return;
    const kept = await credentials.answer(one.name, typed);
    if (!isProblem(kept)) return void console.log(`  ✓ kept ${kept.names.join(", ")}`);
    console.log(`  ✗ ${kept.reason}`);
  }
}

/** The test repo, made with `gh` only if you say so. */
async function offerRepo(): Promise<void> {
  const org = orStop(await store.read())["TEST_ORG"] ?? "";
  if (org === "" || (await run(["gh", "api", `repos/${org}/sandbox/contents/sum.test.mjs`, "--silent"])).code === 0) return;
  if ((await ask(`\nMake the private repo ${org}/sandbox with one passing test? y/N: `)).trim().toLowerCase() !== "y") return;
  const made = await ensureRepo(run, `${org}/sandbox`);
  console.log(isProblem(made) ? `  ✗ ${made.reason}` : `  ✓ ${org}/sandbox is ready`);
}

async function offerApp(rows: readonly Row[]): Promise<void> {
  if (rows.some(({ name, there }) => !there && (name === "TEST_ORG" || name === "TEST_DOMAIN"))) return;
  if (rows.every(({ source, there }) => source !== "GithubApp" || there)) return;
  if ((await ask("\nMake the GitHub App now? A page opens, you press one button. y/N: ")).trim().toLowerCase() !== "y") return;
  const code = await appCode(async (returnTo) => {
    const made = await credentials.app(returnTo);
    return isProblem(made) ? made.reason : made;
  });
  if (code === undefined) return void console.log("  ✗ GitHub did not come back within 15 minutes");
  const answer = await fetch(`https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`, {
    method: "POST",
    headers: GITHUB,
  });
  const kept = await credentials.keepApp(answer.ok ? await answer.json() : undefined);
  console.log(isProblem(kept) ? `  ✗ ${kept.reason}` : `  ✓ kept ${kept.names.join(", ")}`);
}

async function setUp(): Promise<void> {
  orStop(await credentials.make());
  await show();
  console.log('\nThey are kept in Bitwarden, in the note "' + ITEM + '". Nothing is kept in a file.');
  for (const one of orStop(await credentials.toAsk())) {
    const waits = orStop(await credentials.waitsFor(one));
    if (waits.length > 0) {
      console.log(`\n${one.name} needs ${waits.join(" and ")} first.`);
      continue;
    }
    // The token must reach the repo, so the repo comes first.
    if (one.name === "GH_PERSON_TOKEN") await offerRepo();
    await askFor(one);
  }
  await offerApp(orStop(await credentials.list()));
  console.log("");
  const rows = await show();
  if (rows.every(({ there }) => there)) console.log("Next: pnpm credentials run pnpm staging --apply");
}

async function runWith(argv: readonly string[]): Promise<never> {
  const values = orStop(await store.read());
  const [program = "", ...args] = argv;
  const child = spawnSync(program, args, { stdio: "inherit", env: { ...process.env, ...values } });
  process.exit(child.status ?? 1);
}

if (first === undefined) await setUp();
else if (first === "--list") await show();
else await runWith(rest);

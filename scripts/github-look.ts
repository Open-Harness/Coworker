import { createSign } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { liveSettings } from "../src/bin/live-settings.ts";

/**
 * `pnpm credentials run node scripts/github-look.ts` says what the GitHub App may do, and keeps one real delivery of each
 * event the test repo has sent in the last days, for tests to be written from. It reads only. No key or token is printed
 * or kept. What it keeps is git-ignored until someone has read it, and e-mail addresses are taken out.
 */
const OUT = "docs/private/github-recorded";
const NEEDS: Readonly<Record<string, string>> = {
  contents: "write",
  pull_requests: "write",
  issues: "write",
  checks: "read",
  metadata: "read",
};
const WANTED: readonly (readonly [string, readonly string[]])[] = [
  ["issues", ["opened", "labeled", "closed"]],
  ["issue_comment", ["created"]],
  ["pull_request", ["opened", "synchronize", "closed"]],
  ["pull_request_review", ["submitted"]],
  ["pull_request_review_comment", ["created"]],
  ["check_suite", ["completed"]],
  ["check_run", ["completed"]],
  ["push", [""]],
];

type Json = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const record = (value: unknown): Json => (isRecord(value) ? value : {});
const list = (value: unknown): readonly Json[] => (Array.isArray(value) ? value.filter(isRecord) : []);

const settings: Readonly<Record<string, string>> = liveSettings();
const missing = ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "LIVE_GITHUB_REPO"].filter((name) => settings[name] === undefined);
if (missing.length > 0) {
  console.error(`Missing: ${missing.join(", ")}. Run it as: pnpm credentials run node scripts/github-look.ts`);
  process.exit(1);
}
const repo = settings["LIVE_GITHUB_REPO"] ?? "";

function jwt(): string {
  const part = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = `${part({ alg: "RS256", typ: "JWT" })}.${part({ iat: now - 60, exp: now + 540, iss: settings["GITHUB_APP_ID"] })}`;
  const key = (settings["GITHUB_APP_PRIVATE_KEY"] ?? "").replaceAll("\\n", "\n");
  return `${body}.${createSign("RSA-SHA256").update(body).sign(key, "base64url")}`;
}

async function read(path: string): Promise<{ readonly value: unknown; readonly next: string | undefined }> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { authorization: `Bearer ${jwt()}`, accept: "application/vnd.github+json", "user-agent": "live-tests" },
  });
  if (!response.ok) {
    console.error(`GitHub answered ${response.status} for ${path.split("?")[0] ?? path}`);
    process.exit(1);
  }
  const next = /<https:\/\/api\.github\.com([^>]+)>; rel="next"/u.exec(response.headers.get("link") ?? "")?.[1];
  return { value: await response.json(), next };
}

const scrubbed = (value: unknown): string =>
  JSON.stringify(value, null, 2).replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu, (found) =>
    found.startsWith("git@") ? found : "someone@example.test",
  );

async function rights(): Promise<void> {
  const app = record((await read("/app")).value);
  const has = record(app["permissions"]);
  console.log("\nWhat the App may do");
  for (const [name, needs] of Object.entries(NEEDS)) {
    const now = typeof has[name] === "string" ? has[name] : "nothing";
    console.log(`  ${name}: ${now}${now === needs || now === "write" ? "" : `   <- needs ${needs}`}`);
  }
  const events = new Set(Array.isArray(app["events"]) ? app["events"] : []);
  const absent = WANTED.map(([event]) => event).filter((event) => !events.has(event));
  console.log(`  events it does not hear: ${absent.length === 0 ? "none" : absent.join(", ")}`);
  for (const one of list((await read("/app/installations")).value)) {
    const given = record(one["permissions"])["contents"];
    console.log(
      `  an installation: ${String(one["repository_selection"])} repos, contents ${typeof given === "string" ? given : "nothing"}`,
    );
  }
}

async function deliveries(): Promise<void> {
  const found: { readonly name: string; readonly id: number; readonly from: unknown }[] = [];
  let path: string | undefined = "/app/hook/deliveries?per_page=100";
  for (let page = 0; page < 20 && path !== undefined; page += 1) {
    const answer: Awaited<ReturnType<typeof read>> = await read(path);
    for (const one of list(answer.value)) {
      const name = `${String(one["event"])}.${typeof one["action"] === "string" ? one["action"] : ""}`;
      const { id, repository_id: from } = one;
      if (typeof id === "number" && typeof from === "number") found.push({ name, id, from });
    }
    path = answer.next;
  }
  const kept = new Set<string>();
  /** Repos whose one payload we read and that are not the test repo: their other deliveries are not fetched. */
  const others = new Set<unknown>();
  mkdirSync(OUT, { recursive: true });
  for (const { name, id, from } of found) {
    if (kept.has(name) || others.has(from) || !WANTED.some(([event, actions]) => actions.some((action) => name === `${event}.${action}`)))
      continue;
    const payload = record(record((await read(`/app/hook/deliveries/${id}`)).value)["request"])["payload"];
    if (record(record(payload)["repository"])["full_name"] !== repo) {
      others.add(from);
      continue;
    }
    kept.add(name);
    writeFileSync(`${OUT}/${name.replace(/\.$/u, "")}.json`, `${scrubbed(payload)}\n`);
  }
  const wanted = WANTED.flatMap(([event, actions]) => actions.map((action) => `${event}.${action}`));
  console.log(`\nKept in ${OUT}: ${[...kept].join(", ") || "nothing"}`);
  console.log(`Not seen yet in ${repo}: ${wanted.filter((name) => !kept.has(name)).join(", ") || "none"}`);
}

await rights();
await deliveries();

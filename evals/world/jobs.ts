import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { env, git, root } from "./git.ts";
import { budget, modelOf, record, spentDollars, withUsage } from "./budget.ts";
import { json } from "./http.ts";

/*
 * For the jobs only: `https://models.jobs.test` is a real provider, the one the settings name. The key is added here, in
 * this process: neither the product nor an eval ever holds it. And hidden tests are run on what was made.
 */

const set = (name: string): string | undefined => (process.env[name] === "" ? undefined : process.env[name]);
export const jobSettings = () => ({
  doer: set("JOBS_MODEL"),
  reviewer: set("JOBS_REVIEWER") ?? set("JOBS_MODEL"),
  judge: set("JOBS_JUDGE") ?? set("JOBS_MODEL"),
  thinking: set("JOBS_THINKING") ?? "low",
});
export const spent = { input: 0, output: 0, calls: 0 };

export async function realModels(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (url.host !== "models.jobs.test") return undefined;
  const [base, key] = [set("JOBS_BASE_URL"), set("JOBS_KEY")];
  if (base === undefined || key === undefined) return json({ error: { message: "Set JOBS_BASE_URL and JOBS_KEY to run the jobs" } }, 401);
  // Anthropic's OpenAI-compatible endpoint lists its models only with its own version header; other servers ignore it.
  const headers = new Headers({ "content-type": "application/json", authorization: `Bearer ${key}`, "anthropic-version": "2023-06-01" });
  const limit = budget();
  if (limit !== undefined && spentDollars() >= limit) return json({ error: { message: `JOBS_BUDGET reached: $${spentDollars().toFixed(2)} of $${limit} spent` } }, 402);
  const body = request.method === "GET" ? undefined : withUsage(await request.text());
  const response = await fetch(`${base.replace(/\/$/u, "")}${url.pathname.replace(/^\/v1/u, "")}`, { method: request.method, headers, ...(body === undefined ? {} : { body }) });
  spent.calls += 1;
  if (response.body === null) return new Response(null, { status: response.status });
  const text = await response.text();
  if (body !== undefined) record(modelOf(body), body, text);
  for (const [, input = "0", output = "0"] of text.matchAll(/"prompt_tokens":\s*(\d+)[\s\S]{0,40}?"completion_tokens":\s*(\d+)/gu)) {
    spent.input += Number(input);
    spent.output += Number(output);
  }
  return new Response(text, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
}

/** Runs a command on a branch with files laid over it, outside any box. The hidden tests of a job. */
export async function runOn(bare: string, branch: string, files: Readonly<Record<string, string>>, command: string): Promise<{ readonly ok: boolean; readonly says: string }> {
  const work = await mkdtemp(join(root, "hidden-"));
  await git(root, "clone", "--quiet", "--branch", branch, bare, work);
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(work, path)), { recursive: true });
    await writeFile(join(work, path), text);
  }
  const ran = promisify(execFile)("sh", ["-c", command], { cwd: work, env: { ...env, PATH: `${dirname(process.execPath)}:${env.PATH}` }, timeout: 60_000 });
  return ran.then(
    ({ stdout }) => ({ ok: true, says: stdout.slice(-2000) }),
    (error: { stdout?: string; stderr?: string }) => ({ ok: false, says: `${error.stdout ?? ""}${error.stderr ?? ""}`.slice(-2000) }),
  );
}

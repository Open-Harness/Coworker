import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { changedFiles, env, git, head, root, tryGit } from "./git.ts";
import { bodyOf, json, text, type Json } from "./http.ts";
import * as people from "./people.ts";
import { BOT, repoOf, tokens } from "./state.ts";

/*
 * `https://boxes.flows.test`: containers, and the push. A box is a folder with a real clone in it; a command is really
 * run there by `sh`, offline, with nothing of this machine's environment but PATH. `src/modules/boxes/testing.ts` is the
 * product's side of it. What each box was given and ran is kept, so a flow can look.
 */

interface Box {
  readonly work: string;
  folder: string;
  readonly repo: string | null;
  readonly token: Readonly<Record<string, string>> | null;
  readonly env: Readonly<Record<string, string>>;
  readonly ran: { readonly command: string; readonly exitCode: number }[];
  started: number;
}

const boxes = new Map<string, Box>();
const snapshots = new Map<string, string>();
/** Works whose every box ever is kept for the flows to look at, also when it is gone. */
const history: Box[] = [];
/** Repos whose boxes cannot start; `null` is every repo. */
const down = new Set<string | null>();

const inside = (box: Box, path: string): string => {
  const full = resolve(box.folder, path);
  if (full !== box.folder && !full.startsWith(`${box.folder}/`)) throw new Error("outside the box");
  return full;
};

function exec(box: Box, command: string, seconds: number, extra: Readonly<Record<string, string>>): Promise<Json> {
  const started = Date.now();
  return new Promise((done) => {
    const child = spawn("/bin/sh", ["-c", command], { cwd: box.folder, env: { ...env, HOME: box.folder, ...box.env, ...extra }, detached: true });
    const out = { stdout: "", stderr: "" };
    child.stdout.on("data", (part: Buffer) => void (out.stdout += part.toString("utf8")));
    child.stderr.on("data", (part: Buffer) => void (out.stderr += part.toString("utf8")));
    const stop = setTimeout(() => child.pid !== undefined && process.kill(-child.pid, "SIGKILL"), seconds * 1000);
    child.on("close", (code) => {
      clearTimeout(stop);
      const exitCode = code ?? 137;
      box.ran.push({ command, exitCode });
      done({ exitCode, ...out, seconds: (Date.now() - started) / 1000 });
    });
  });
}

async function start(body: Json): Promise<Response> {
  const work = text(body["work"]);
  const clone = body["clone"] as { url: string; token: string; branch: string } | null;
  const named = clone === null ? null : (/github\.com\/([^/]+\/[^/.]+)/u.exec(clone.url)?.[1]?.toLowerCase() ?? null);
  if (down.has(null) || (named !== null && down.has(named))) return json({ _tag: "Unavailable", why: "No containers are free" });
  const from = body["from"] as { snapshot: string } | null;
  const folder = await mkdtemp(join(root, "box-"));
  const repo = clone === null ? null : (/github\.com\/([^/]+\/[^/.]+)/u.exec(clone.url)?.[1] ?? null);
  const token = clone === null ? null : (tokens.get(clone.token)?.permissions ?? {});
  const box: Box = { work, folder, repo, token, env: (body["env"] ?? {}) as Record<string, string>, ran: [], started: 1 };
  const saved = from === null ? undefined : snapshots.get(from.snapshot);
  if (saved !== undefined) await cp(saved, folder, { recursive: true });
  else if (repo !== null && clone !== null) {
    const there = repoOf(repo);
    if (there === undefined || tokens.get(clone.token)?.repos.includes(repo.toLowerCase()) !== true)
      return json({ _tag: "Unavailable", why: "The repo could not be cloned: not found" });
    await git(root, "clone", "--quiet", there.folder, folder);
    const branch = (await head(there.folder, clone.branch)) === undefined ? "main" : clone.branch;
    await git(folder, "checkout", "--quiet", "-B", clone.branch, `origin/${branch}`);
    // What is in a box must not know the way back: the push is done outside it.
    await git(folder, "remote", "set-url", "origin", `https://github.com/${repo}.git`);
  }
  boxes.set(work, box);
  history.push(box);
  const setUp = text(body["setUp"]);
  if (saved === undefined && setUp !== "") {
    const ran = await exec(box, setUp, 60, {});
    if (ran["exitCode"] !== 0) return json({ _tag: "Unavailable", why: `Setting up failed: ${text(ran["stderr"]).slice(0, 400)}` });
  }
  return json({ _tag: "Open", from: saved === undefined ? "new" : "saved" });
}

async function push(body: Json, bearer: string): Promise<Response> {
  const token = tokens.get(bearer);
  const repo = repoOf(text(body["repo"]));
  const branch = text(body["branch"]);
  if (repo === undefined || token === undefined || !token.repos.includes(repo.name.toLowerCase()) || token.permissions["contents"] !== "write")
    return json({ _tag: "Refused", why: "The token cannot write to the contents of this repo" });
  if (repo.guarded && branch === "main") return json({ _tag: "Refused", why: "main is protected" });
  const file = join(await mkdtemp(join(root, "bundle-")), "it.bundle");
  await writeFile(file, Buffer.from(text(body["bytes"]), "base64"));
  const before = await head(repo.folder, branch);
  const got = await tryGit(repo.folder, "fetch", "--quiet", file, `+${branch}:refs/incoming/${branch}`);
  if (got === undefined) return json({ _tag: "Refused", why: "The bundle could not be read" });
  const after = await git(repo.folder, "rev-parse", `refs/incoming/${branch}`);
  const flows = (await changedFiles(repo.folder, "main", after)).some(({ path }) => path.startsWith(".github/workflows/"));
  if (flows && token.permissions["workflows"] !== "write") return json({ _tag: "Refused", why: "refusing to allow a GitHub App to update workflow without `workflows` permission" });
  const straight = before === undefined || (await tryGit(repo.folder, "merge-base", "--is-ancestor", before, after)) !== undefined;
  if (!straight && body["force"] !== "only if it is ours") return json({ _tag: "Refused", why: "non-fast-forward" });
  await git(repo.folder, "update-ref", `refs/heads/${branch}`, after);
  if (before !== after) await people.moved(repo, BOT, branch, before ?? "0".repeat(40), after);
  return json({ _tag: "Pushed", head: after });
}

/** Between flows and the world: what a work's boxes were, or lose one. */
export function lookAtBoxes(repo: string): readonly Json[] {
  return history
    .filter((box) => box.repo?.toLowerCase() === repo.toLowerCase())
    .map(({ work, token, env: given, ran }) => ({ work, token, env: given, ran, there: boxes.has(work) }));
}
export function loseBoxes(repo: string, also: "snapshots" | "nothing"): void {
  for (const [work, box] of boxes) if (box.repo?.toLowerCase() === repo.toLowerCase()) boxes.delete(work);
  if (also === "snapshots") snapshots.clear();
}
/** No container is free: for one repo's boxes, or, with no repo, for all of them. */
export const boxesDown = (is: boolean, repo: string | null = null): void => void (is ? down.add(repo?.toLowerCase() ?? null) : down.delete(repo?.toLowerCase() ?? null));

async function onBox(box: Box, action: string, body: Json): Promise<Response> {
  if (action === "exec") return json(await exec(box, text(body["command"]), Number(body["seconds"] ?? 60), (body["env"] ?? {}) as Record<string, string>));
  if (action === "read") {
    const found = await readFile(inside(box, text(body["path"])), "utf8").catch(() => undefined);
    return json({ text: found ?? null });
  }
  if (action === "write") {
    const full = inside(box, text(body["path"]));
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, text(body["text"]));
    return json({});
  }
  if (action === "save") {
    const kept = await mkdtemp(join(root, "snapshot-"));
    await cp(box.folder, kept, { recursive: true });
    snapshots.set(kept, kept);
    return json({ snapshot: kept });
  }
  if (action !== "destroy") return json({ message: "Not Found" }, 404);
  boxes.delete(box.work);
  await rm(box.folder, { recursive: true, force: true });
  return json({});
}

export async function boxesAndPush(request: Request): Promise<Response | undefined> {
  const { host, pathname } = new URL(request.url);
  if (host !== "boxes.flows.test") return undefined;
  const body = await bodyOf(request);
  if (pathname === "/start") return start(body);
  if (pathname === "/push") return push(body, (request.headers.get("authorization") ?? "").replace(/^Bearer /u, ""));
  const box = boxes.get(text(body["work"]));
  if (pathname === "/find") return json({ there: box !== undefined });
  return box === undefined ? json({ message: "The box is gone" }, 410) : onBox(box, pathname.slice(1), body);
}

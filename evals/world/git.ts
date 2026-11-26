import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

/*
 * Real git in a temporary folder: the fake GitHub keeps each repo as a bare one, and a fake box is a clone of it. No
 * network: every remote is a folder.
 */

const run = promisify(execFile);
export const root = await mkdtemp(join(tmpdir(), "coworker-world-"));

export const env = {
  PATH: process.env["PATH"] ?? "/usr/bin:/bin",
  HOME: root,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_TERMINAL_PROMPT: "0",
  GIT_AUTHOR_NAME: "Someone",
  GIT_AUTHOR_EMAIL: "someone@example.test",
  GIT_COMMITTER_NAME: "Someone",
  GIT_COMMITTER_EMAIL: "someone@example.test",
};

export async function git(cwd: string, ...args: readonly string[]): Promise<string> {
  const { stdout } = await run("git", [...args], { cwd, env, maxBuffer: 64 * 1_048_576 });
  return stdout.replace(/\n$/u, "");
}

/** The answer, or undefined when git says no. */
export const tryGit = (cwd: string, ...args: readonly string[]): Promise<string | undefined> => git(cwd, ...args).catch(() => undefined);

const folderOf = (repo: string): string => join(root, "repos", `${repo}.git`);

export async function makeRepo(repo: string, files: Readonly<Record<string, string>>): Promise<string> {
  const bare = folderOf(repo);
  await mkdir(dirname(bare), { recursive: true });
  await git(root, "init", "--quiet", "--bare", "--initial-branch=main", bare);
  await commit(bare, "main", files, "Start", { start: true });
  return bare;
}

/** A commit on a branch of a bare repo, from the world (a person, or CI). Answers its sha. */
export async function commit(
  bare: string,
  branch: string,
  files: Readonly<Record<string, string | null>>,
  message: string,
  options: { readonly start?: boolean; readonly from?: string } = {},
): Promise<string> {
  const work = await mkdtemp(join(root, "commit-"));
  if (options.start === true) await git(work, "init", "--quiet", `--initial-branch=${branch}`);
  else {
    await git(root, "clone", "--quiet", bare, work);
    const there = await tryGit(work, "rev-parse", `origin/${branch}`);
    await git(work, "checkout", "--quiet", "-B", branch, there ?? `origin/${options.from ?? "main"}`);
  }
  for (const [path, text] of Object.entries(files)) {
    if (text === null) await rm(join(work, path), { force: true });
    else {
      await mkdir(dirname(join(work, path)), { recursive: true });
      await writeFile(join(work, path), text);
    }
  }
  await git(work, "add", "--all");
  await git(work, "commit", "--quiet", "--allow-empty", "-m", message);
  await git(work, "push", "--quiet", bare, `HEAD:refs/heads/${branch}`);
  const sha = await git(work, "rev-parse", "HEAD");
  await rm(work, { recursive: true, force: true });
  return sha;
}

export const head = (bare: string, branch: string): Promise<string | undefined> =>
  tryGit(bare, "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`);

export const baseOf = (bare: string, a: string, b: string): Promise<string | undefined> => tryGit(bare, "merge-base", a, b);

/** Merges `from` into `into`, as GitHub's merge button does. Undefined when they conflict. */
export async function merge(bare: string, into: string, from: string, message: string, squash: boolean): Promise<string | undefined> {
  const [ours, theirs] = [await head(bare, into), await head(bare, from)];
  if (ours === undefined || theirs === undefined) return undefined;
  const tree = await tryGit(bare, "merge-tree", "--write-tree", ours, theirs);
  if (tree === undefined) return undefined;
  const parents = squash ? ["-p", ours] : ["-p", ours, "-p", theirs];
  const made = await git(bare, "commit-tree", tree.split("\n")[0] ?? "", ...parents, "-m", message);
  await git(bare, "update-ref", `refs/heads/${into}`, made);
  return made;
}

export interface Changed {
  readonly path: string;
  readonly status: "added" | "modified" | "removed";
  readonly patch: string;
}

export async function changedFiles(bare: string, base: string, at: string): Promise<readonly Changed[]> {
  const names = (await tryGit(bare, "diff", "--name-status", "--no-renames", `${base}...${at}`)) ?? "";
  return Promise.all(
    names
      .split("\n")
      .filter((line) => line !== "")
      .map(async (line) => {
        const [mark = "M", path = ""] = line.split("\t");
        const diff = await git(bare, "diff", "--no-renames", `${base}...${at}`, "--", path);
        const from = diff.indexOf("@@");
        return { path, status: mark === "A" ? "added" : mark === "D" ? "removed" : "modified", patch: from < 0 ? "" : diff.slice(from) } as const;
      }),
  );
}

/** Whether `from` merges into `into` without a conflict: what GitHub works out for `mergeable` when it is asked. */
export async function mergeable(bare: string, into: string, from: string): Promise<boolean | undefined> {
  const [ours, theirs] = [await head(bare, into), await head(bare, from)];
  if (ours === undefined || theirs === undefined) return undefined;
  return (await tryGit(bare, "merge-tree", "--write-tree", ours, theirs)) !== undefined;
}

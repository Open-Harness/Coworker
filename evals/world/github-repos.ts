import { changedFiles, git, head, tryGit } from "./git.ts";
import { json, list, stamp, text, type Json } from "./http.ts";
import * as people from "./people.ts";
import { commentJson, issueJson, personJson, pullJson, reviewJson } from "./payloads.ts";
import { BOT, type Issue, type Repo, type Token } from "./state.ts";

/* Everything under /repos/<owner>/<name>. Each route says which right it needs. */

export interface Asked {
  readonly method: string;
  readonly rest: string;
  readonly repo: Repo;
  readonly token: Token;
  readonly body: Json;
  readonly query: URLSearchParams;
}

type Route = readonly [method: string, path: RegExp, right: string, answer: (asked: Asked, part: readonly string[]) => Promise<Response> | Response];

const gone = (): Response => json({ message: "Not Found" }, 404);
const issueAt = ({ repo }: Asked, number: string | undefined): Issue | undefined => repo.issues.get(Number(number));
const withIssue = (asked: Asked, number: string | undefined, answer: (issue: Issue) => Promise<Response> | Response) => {
  const issue = issueAt(asked, number);
  return issue === undefined ? gone() : answer(issue);
};
const withPull = (asked: Asked, number: string | undefined, answer: (issue: Issue) => Promise<Response> | Response) =>
  withIssue(asked, number, (issue) => (issue.pull === undefined ? gone() : answer(issue)));

async function contents({ repo, query }: Asked, path: string): Promise<Response> {
  const ref = query.get("ref") ?? "main";
  const kind = await tryGit(repo.folder, "cat-file", "-t", `${ref}:${path}`);
  if (kind === undefined) return gone();
  if (kind === "tree") {
    const names = await git(repo.folder, "ls-tree", "--name-only", `${ref}:${path}`);
    return json(names.split("\n").map((name) => ({ name, path: path === "" ? name : `${path}/${name}` })));
  }
  const body = await git(repo.folder, "show", `${ref}:${path}`);
  return json({ path, type: "file", encoding: "base64", content: Buffer.from(`${body}\n`).toString("base64") });
}

async function patchIssue(asked: Asked, issue: Issue): Promise<Response> {
  issue.updated = stamp();
  if (typeof asked.body["title"] === "string") issue.title = asked.body["title"];
  if (typeof asked.body["body"] === "string") issue.body = asked.body["body"];
  if (asked.body["state"] === "closed") await people.close(asked.repo, BOT, issue);
  if (Array.isArray(asked.body["labels"])) issue.labels = list(asked.body["labels"]).map(text);
  return json(issue.pull === undefined ? issueJson(asked.repo, issue) : await pullJson(asked.repo, issue));
}

async function openPull(asked: Asked): Promise<Response> {
  const { repo, body } = asked;
  const [branch, base] = [text(body["head"]).split(":").at(-1) ?? "", text(body["base"])];
  if ((await head(repo.folder, branch)) === undefined) return json({ message: "Validation Failed", errors: [{ field: "head", code: "invalid" }] }, 422);
  const open = [...repo.issues.values()].find(({ pull, state }) => state === "open" && pull?.branch === branch);
  if (open !== undefined) return json({ message: "Validation Failed", errors: [{ message: "A pull request already exists" }] }, 422);
  return json(await pullJson(repo, await people.openPull(repo, BOT, text(body["title"]), text(body["body"]), branch, base)), 201);
}

const checkJson = ({ id, name, conclusion, sha }: Repo["checks"][number]) => ({ id, name, status: "completed", conclusion, head_sha: sha });

const ROUTES: readonly Route[] = [
  ["GET", /^\/contents\/?(.*)$/u, "contents:read", (asked, [path = ""]) => contents(asked, decodeURIComponent(path))],
  ["GET", /^\/(?:git\/ref|git\/refs|branches)\/(?:heads\/)?(.+)$/u, "contents:read", async ({ repo }, [branch = ""]) => {
    const sha = await head(repo.folder, branch);
    return sha === undefined ? gone() : json({ ref: `refs/heads/${branch}`, name: branch, object: { sha }, commit: { sha } });
  }],
  ["DELETE", /^\/git\/refs\/heads\/(.+)$/u, "contents:write", async ({ repo }, [branch = ""]) => {
    await tryGit(repo.folder, "update-ref", "-d", `refs/heads/${branch}`);
    return new Response(null, { status: 204 });
  }],
  ["GET", /^\/compare\/(.+)\.\.\.(.+)$/u, "contents:read", async ({ repo }, [base = "", at = ""]) => {
    const files = await changedFiles(repo.folder, base, at);
    const ahead = Number((await tryGit(repo.folder, "rev-list", "--count", `${base}..${at}`)) ?? 0);
    const behind = Number((await tryGit(repo.folder, "rev-list", "--count", `${at}..${base}`)) ?? 0);
    return json({ ahead_by: ahead, behind_by: behind, files: files.map(({ path, ...file }) => ({ filename: path, ...file })) });
  }],
  ["GET", /^\/collaborators\/([^/]+)\/permission$/u, "metadata:read", ({ repo }, [login = ""]) =>
    json({ permission: repo.people.get(login) ?? "none", role_name: repo.people.get(login) ?? "none", user: { login } })],
  ["GET", /^\/issues$/u, "issues:read", ({ repo }) => json([...repo.issues.values()].filter(({ state }) => state === "open").map((one) => issueJson(repo, one)))],
  ["POST", /^\/issues$/u, "issues:write", ({ repo, body }) =>
    json(issueJson(repo, people.openIssue(repo, BOT, text(body["title"]), text(body["body"]), list(body["labels"]).map(text))), 201)],
  ["GET", /^\/issues\/(\d+)$/u, "issues:read", (asked, [n]) => withIssue(asked, n, (issue) => json(issueJson(asked.repo, issue)))],
  ["PATCH", /^\/issues\/(\d+)$/u, "issues:write", (asked, [n]) => withIssue(asked, n, (issue) => patchIssue(asked, issue))],
  ["GET", /^\/issues\/(\d+)\/comments$/u, "issues:read", (asked, [n]) =>
    withIssue(asked, n, (issue) => json(issue.comments.map((one) => commentJson(asked.repo, issue.number, one))))],
  ["POST", /^\/issues\/(\d+)\/comments$/u, "issues:write|pull_requests:write", (asked, [n]) =>
    withIssue(asked, n, (issue) => json({ id: people.comment(asked.repo, BOT, issue, text(asked.body["body"])), body: asked.body["body"], html_url: `https://github.com/${asked.repo.name}/issues/${issue.number}` }, 201))],
  ["POST", /^\/issues\/(\d+)\/labels$/u, "issues:write|pull_requests:write", (asked, [n]) =>
    withIssue(asked, n, (issue) => {
      for (const name of list(asked.body["labels"])) people.label(asked.repo, BOT, issue, text(name));
      return json(issue.labels.map((name) => ({ name })));
    })],
  ["DELETE", /^\/issues\/(\d+)\/labels\/(.+)$/u, "issues:write|pull_requests:write", (asked, [n, name]) =>
    withIssue(asked, n, (issue) => {
      issue.labels = issue.labels.filter((one) => one !== decodeURIComponent(name ?? ""));
      return json(issue.labels.map((one) => ({ name: one })));
    })],
  ["GET", /^\/pulls$/u, "pull_requests:read", async ({ repo, query }) => {
    const branch = query.get("head")?.split(":").at(-1);
    const state = query.get("state") ?? "open";
    const found = [...repo.issues.values()].filter(
      ({ pull, state: is }) => pull !== undefined && (state === "all" || is === state) && (branch === undefined || pull.branch === branch),
    );
    return json(await Promise.all(found.map((one) => pullJson(repo, one))));
  }],
  ["POST", /^\/pulls$/u, "pull_requests:write", openPull],
  ["GET", /^\/pulls\/(\d+)$/u, "pull_requests:read", (asked, [n]) => withPull(asked, n, async (issue) => json(await pullJson(asked.repo, issue, true)))],
  ["PATCH", /^\/pulls\/(\d+)$/u, "pull_requests:write", (asked, [n]) => withPull(asked, n, (issue) => patchIssue(asked, issue))],
  ["GET", /^\/pulls\/(\d+)\/files$/u, "pull_requests:read", (asked, [n]) =>
    withPull(asked, n, async ({ pull }) => {
      const files = await changedFiles(asked.repo.folder, pull?.base ?? "main", pull?.branch ?? "main");
      return json(files.map(({ path, ...file }) => ({ filename: path, ...file })));
    })],
  ["GET", /^\/pulls\/(\d+)\/comments$/u, "pull_requests:read", (asked, [n]) =>
    withPull(asked, n, ({ pull, number }) => json((pull?.lines ?? []).map((one) => commentJson(asked.repo, number, one))))],
  ["POST", /^\/pulls\/(\d+)\/comments\/(\d+)\/replies$/u, "pull_requests:write", (asked, [n, answers]) =>
    withPull(asked, n, async (issue) => {
      const about = issue.pull?.lines.find(({ id }) => id === Number(answers));
      if (about === undefined) return gone();
      const at = { path: about.path ?? "", line: about.line ?? 0, body: text(asked.body["body"]), answers: about.answers ?? about.id };
      return json({ id: await people.lineComment(asked.repo, BOT, issue, at) }, 201);
    })],
  ["GET", /^\/pulls\/(\d+)\/reviews$/u, "pull_requests:read", (asked, [n]) =>
    withPull(asked, n, ({ pull, number }) => json((pull?.reviews ?? []).map((one) => reviewJson(asked.repo, number, one))))],
  ["PUT", /^\/pulls\/(\d+)\/merge$/u, "contents:write", (asked, [n]) =>
    withPull(asked, n, async (issue) => {
      const why = await people.mergePull(asked.repo, BOT, issue, asked.body["merge_method"] !== "merge");
      return why === undefined ? json({ merged: true, sha: issue.pull?.mergeSha }) : json({ message: why }, 405);
    })],
  ["GET", /^\/commits\/([^/]+)\/check-runs$/u, "checks:read", async ({ repo }, [ref = ""]) => {
    const sha = (await tryGit(repo.folder, "rev-parse", "--verify", "--quiet", ref)) ?? ref;
    const found = repo.checks.filter((one) => one.sha === sha);
    return json({ total_count: found.length, check_runs: found.map(checkJson) });
  }],
  ["POST", /^\/check-runs\/(\d+)\/rerequest$/u, "checks:write", () => json({}, 201)],
  ["GET", /^\/check-runs\/(\d+)\/annotations$/u, "checks:read", () => json([])],
  ["GET", /^\/check-runs\/(\d+)$/u, "checks:read", ({ repo }, [id]) => {
    const found = repo.checks.find((one) => one.id === Number(id));
    return found === undefined ? gone() : json({ ...checkJson(found), output: { title: found.name, summary: found.log, text: found.log } });
  }],
  ["GET", /^\/actions\/jobs\/(\d+)\/logs$/u, "actions:read", ({ repo }, [id]) => {
    const found = repo.checks.find((one) => one.id === Number(id));
    return found === undefined ? gone() : new Response(found.log);
  }],
];

const LEVEL = { read: 1, write: 2 } as Record<string, number>;
const allowed = ({ permissions }: Token, rights: string): boolean =>
  rights.split("|").some((right) => {
    const [name = "", level = "read"] = right.split(":");
    return name === "metadata" || (LEVEL[permissions[name] ?? ""] ?? 0) >= (LEVEL[level] ?? 2);
  });

export async function reposRoute(asked: Asked): Promise<Response | undefined> {
  for (const [method, path, right, answer] of ROUTES) {
    const match = method === asked.method ? path.exec(asked.rest) : null;
    if (match === null) continue;
    if (!allowed(asked.token, right)) return json({ message: "Resource not accessible by integration" }, 403);
    return answer(asked, match.slice(1));
  }
  return undefined;
}

export { personJson };

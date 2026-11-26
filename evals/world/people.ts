import { commit, head } from "./git.ts";
import { next, stamp } from "./http.ts";
import { commentJson, happened, issueJson, personJson, pullJson, reviewJson } from "./payloads.ts";
import type { Issue, Person, Repo } from "./state.ts";
import * as git from "./git.ts";

/* What happens on GitHub: by a person, by CI, or by the app. Each makes the webhooks GitHub would. */

/** Every change of an issue or pull request moves its `updated_at`, to a later whole second. */
const touch = (issue: Issue): string => (issue.updated = stamp());

export function openIssue(repo: Repo, by: Person, title: string, body: string, labels: readonly string[]): Issue {
  const at = stamp();
  const issue: Issue = { number: repo.issues.size + 1, by, title, body, state: "open", labels: [...labels], comments: [], created: at, updated: at };
  repo.issues.set(issue.number, issue);
  happened(repo, by, "issues", "opened", { issue: issueJson(repo, issue) });
  for (const name of labels) happened(repo, by, "issues", "labeled", { issue: issueJson(repo, issue), label: { name } });
  return issue;
}

export function label(repo: Repo, by: Person, issue: Issue, name: string): void {
  if (!issue.labels.includes(name)) issue.labels.push(name);
  touch(issue);
  happened(repo, by, "issues", "labeled", { issue: issueJson(repo, issue), label: { name } });
}

export function comment(repo: Repo, by: Person, issue: Issue, body: string): number {
  const at = touch(issue);
  const made = { id: next(), by, body, at, updated: at };
  issue.comments.push(made);
  happened(repo, by, "issue_comment", "created", { issue: issueJson(repo, issue), comment: commentJson(repo, issue.number, made) });
  return made.id;
}

export async function openPull(repo: Repo, by: Person, title: string, body: string, branch: string, base: string): Promise<Issue> {
  const at = stamp();
  const issue: Issue = {
    number: repo.issues.size + 1,
    created: at,
    updated: at,
    by,
    title,
    body,
    state: "open",
    labels: [],
    comments: [],
    pull: { branch, base, merged: false, mergedBy: null, mergeSha: null, draft: false, reviews: [], lines: [], settled: new Set() },
  };
  repo.issues.set(issue.number, issue);
  happened(repo, by, "pull_request", "opened", { number: issue.number, pull_request: await pullJson(repo, issue) });
  return issue;
}

export async function lineComment(
  repo: Repo,
  by: Person,
  issue: Issue,
  at: { readonly path: string; readonly line: number; readonly body: string; readonly answers?: number },
): Promise<number> {
  const when = touch(issue);
  const made = { id: next(), by, at: when, updated: when, ...at };
  issue.pull?.lines.push(made);
  happened(repo, by, "pull_request_review_comment", "created", {
    pull_request: await pullJson(repo, issue),
    comment: commentJson(repo, issue.number, made),
  });
  return made.id;
}

export async function review(
  repo: Repo,
  by: Person,
  issue: Issue,
  state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED",
  body: string,
): Promise<number> {
  const made = { id: next(), by, state, body, sha: (await head(repo.folder, issue.pull?.branch ?? "")) ?? null, at: touch(issue) };
  issue.pull?.reviews.push(made);
  happened(repo, by, "pull_request_review", "submitted", {
    pull_request: await pullJson(repo, issue),
    review: reviewJson(repo, issue.number, made),
  });
  return made.id;
}

/** CI ends on what the pull request is at now. */
export async function check(repo: Repo, issue: Issue, name: string, conclusion: "success" | "failure", log: string): Promise<void> {
  const { pull } = issue;
  const sha = pull === undefined ? undefined : await head(repo.folder, pull.branch);
  if (pull === undefined || sha === undefined) throw new Error("no such branch");
  const made = { id: next(), sha, name, conclusion, log };
  repo.checks.push(made);
  const when = touch(issue);
  const actions: Person = { id: 42, login: "github-actions[bot]", type: "Bot" };
  const pulls = [{ number: issue.number, head: { ref: pull.branch, sha }, base: { ref: pull.base } }];
  happened(repo, actions, "check_run", "completed", {
    check_run: {
      id: made.id,
      name,
      head_sha: sha,
      status: "completed",
      conclusion,
      started_at: when,
      completed_at: when,
      html_url: `https://github.com/${repo.name}/runs/${made.id}`,
      output: { title: name, summary: log, text: log },
      app: { slug: "github-actions" },
      pull_requests: pulls,
      check_suite: { head_branch: pull.branch },
    },
  });
  happened(repo, actions, "check_suite", "completed", {
    check_suite: { id: next(), head_sha: sha, head_branch: pull.branch, status: "completed", conclusion, pull_requests: pulls },
  });
}

export function pushed(repo: Repo, by: Person, branch: string, before: string, after: string): void {
  happened(repo, by, "push", undefined, { ref: `refs/heads/${branch}`, before, after, pusher: { name: by.login }, deleted: false });
}

/** A branch is somewhere else now: a push, and the pull request on it hears it too. */
export async function moved(repo: Repo, by: Person, branch: string, before: string, after: string): Promise<void> {
  pushed(repo, by, branch, before, after);
  for (const issue of repo.issues.values())
    if (issue.state === "open" && issue.pull?.branch === branch) {
      touch(issue);
      happened(repo, by, "pull_request", "synchronize", { number: issue.number, before, after, pull_request: await pullJson(repo, issue) });
    }
}

/** Someone pushes to a branch: usually main, under our feet. */
export async function push(repo: Repo, by: Person, branch: string, files: Readonly<Record<string, string | null>>, message: string): Promise<string> {
  const before = (await head(repo.folder, branch)) ?? "0".repeat(40);
  const after = await commit(repo.folder, branch, files, message);
  await moved(repo, by, branch, before, after);
  return after;
}

export async function close(repo: Repo, by: Person, issue: Issue): Promise<void> {
  if (issue.state === "closed") return;
  issue.state = "closed";
  touch(issue);
  if (issue.pull === undefined) happened(repo, by, "issues", "closed", { issue: issueJson(repo, issue) });
  else happened(repo, by, "pull_request", "closed", { number: issue.number, pull_request: await pullJson(repo, issue) });
}

const CLOSES = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/giu;

/** Merged, or why not. As GitHub does, it closes the issues its body says it closes. */
export async function mergePull(repo: Repo, by: Person, issue: Issue, squash = true): Promise<string | undefined> {
  const { pull } = issue;
  if (pull === undefined || issue.state === "closed") return "Pull Request is not mergeable";
  const sha = await head(repo.folder, pull.branch);
  const mine = repo.checks.filter((one) => one.sha === sha);
  if (repo.guarded && (mine.length === 0 || mine.some(({ conclusion }) => conclusion !== "success"))) return "Required status checks have not passed";
  const before = (await head(repo.folder, pull.base)) ?? "";
  const merged = await git.merge(repo.folder, pull.base, pull.branch, `${issue.title} (#${issue.number})`, squash);
  if (merged === undefined) return "Pull Request is not mergeable";
  Object.assign(pull, { merged: true, mergedBy: by, mergeSha: merged });
  touch(issue);
  await close(repo, by, issue);
  pushed(repo, by, pull.base, before, merged);
  for (const [, number] of issue.body.matchAll(CLOSES)) {
    const closes = repo.issues.get(Number(number));
    if (closes !== undefined) await close(repo, by, closes);
  }
  return undefined;
}

/** A person settles a thread of line comments (or opens it again). `first` is the id of the thread's first comment. */
export async function settle(repo: Repo, by: Person, issue: Issue, first: number, settled: boolean): Promise<void> {
  const { pull } = issue;
  if (pull === undefined) throw new Error("no such pull request");
  const root = pull.lines.find(({ id }) => id === first);
  if (root === undefined) throw new Error("no such thread");
  pull.settled[settled ? "add" : "delete"](first);
  touch(issue);
  const comments = pull.lines.filter(({ id, answers }) => id === first || answers === first).map((one) => commentJson(repo, issue.number, one));
  happened(repo, by, "pull_request_review_thread", settled ? "resolved" : "unresolved", {
    pull_request: await pullJson(repo, issue),
    thread: { node_id: `PRRT_${first}`, comments },
  });
}

/** What GitHub kept back while the App was suspended, sent again: the owner's button. Answers how many. */
export function redeliver(repo: Repo): number {
  const missed = repo.missed.splice(0);
  repo.deliveries.push(...missed);
  return missed.length;
}

export { personJson };

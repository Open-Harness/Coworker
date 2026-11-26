import { createRequire } from "node:module";
import { isRecord, next, type Json } from "./http.ts";
import { installations, type Comment, type Issue, type Person, type Repo, type Review } from "./state.ts";
import { head, mergeable } from "./git.ts";

/*
 * Webhooks as GitHub sends them: its own published examples (`@octokit/webhooks-examples`), with what this world knows
 * put in. Nothing here is a shape somebody imagined.
 */

const examples = createRequire(import.meta.url)("@octokit/webhooks-examples") as readonly { name: string; examples: readonly Json[] }[];

function example(event: string, action: string | undefined): Json {
  const all = examples.find(({ name }) => name === event)?.examples ?? [];
  // `issues.closed` is the one it does not publish. GitHub documents it as the same body as `reopened`.
  const named = event === "issues" && action === "closed" ? "reopened" : action;
  const found = named === undefined ? all[0] : all.find((entry) => entry["action"] === named);
  if (found === undefined) throw new Error(`GitHub publishes no example of ${event}.${action ?? ""}`);
  return structuredClone(found);
}

function changed(base: Json, change: Json): Json {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(change)) {
    const before = result[key];
    result[key] = isRecord(before) && isRecord(value) ? changed(before, value) : value;
  }
  return result;
}

export const personJson = ({ id, login, type }: Person) => ({ id, login, type, html_url: `https://github.com/${login}` });

export const issueJson = (repo: Repo, issue: Issue) => ({
  id: issue.number * 1000,
  number: issue.number,
  title: issue.title,
  body: issue.body,
  state: issue.state,
  user: personJson(issue.by),
  labels: issue.labels.map((name) => ({ name })),
  html_url: `https://github.com/${repo.name}/issues/${issue.number}`,
  created_at: issue.created,
  updated_at: issue.updated,
  closed_at: issue.state === "closed" ? issue.updated : null,
  state_reason: issue.state === "closed" ? "completed" : null,
  comments: issue.comments.length,
  ...(issue.pull === undefined ? {} : { pull_request: { url: `https://api.github.com/repos/${repo.name}/pulls/${issue.number}` } }),
});

/**
 * `asked`: GitHub is asked for this one, so `mergeable` is worked out. In a delivery it is `null`, as it nearly always is.
 */
export async function pullJson(repo: Repo, issue: Issue, asked = false) {
  const { pull } = issue;
  if (pull === undefined) throw new Error(`#${issue.number} is not a pull request`);
  const [at, base] = [await head(repo.folder, pull.branch), await head(repo.folder, pull.base)];
  const clean = asked && issue.state === "open" ? await mergeable(repo.folder, pull.base, pull.branch) : undefined;
  const side = (ref: string, sha: string | undefined) => ({
    ref,
    sha: sha ?? "0".repeat(40),
    label: `${repo.name.split("/")[0]}:${ref}`,
    repo: { full_name: repo.name, fork: false },
  });
  return {
    id: issue.number * 1000 + 1,
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    draft: pull.draft,
    merged: pull.merged,
    merged_by: pull.mergedBy === null ? null : personJson(pull.mergedBy),
    merge_commit_sha: pull.mergeSha,
    created_at: issue.created,
    updated_at: issue.updated,
    merged_at: pull.merged ? issue.updated : null,
    mergeable: clean ?? null,
    mergeable_state: clean === undefined ? "unknown" : clean ? "clean" : "dirty",
    requested_reviewers: [],
    user: personJson(issue.by),
    html_url: `https://github.com/${repo.name}/pull/${issue.number}`,
    head: side(pull.branch, at),
    base: side(pull.base, base),
    labels: issue.labels.map((name) => ({ name })),
  };
}

export const commentJson = (repo: Repo, number: number, comment: Comment) => ({
  id: comment.id,
  body: comment.body,
  user: personJson(comment.by),
  created_at: comment.at,
  updated_at: comment.updated,
  html_url: `https://github.com/${repo.name}/issues/${number}#issuecomment-${comment.id}`,
  ...(comment.path === undefined
    ? {}
    : { path: comment.path, line: comment.line, original_line: comment.line, side: "RIGHT", in_reply_to_id: comment.answers, pull_request_review_id: null }),
});

export const reviewJson = (repo: Repo, number: number, review: Review) => ({
  id: review.id,
  body: review.body,
  state: review.state.toLowerCase(),
  commit_id: review.sha,
  submitted_at: review.at,
  user: personJson(review.by),
  html_url: `https://github.com/${repo.name}/pull/${number}#pullrequestreview-${review.id}`,
});

/** Puts a webhook in the repo's queue, until a flow asks for it. */
export function happened(repo: Repo, by: Person, event: string, action: string | undefined, change: Json): void {
  const suspended = installations.get(repo.installation)?.on === false && event !== "installation";
  const [owner = "", name = ""] = repo.name.split("/");
  const payload = changed(example(event, action), {
    installation: { id: repo.installation },
    repository: { full_name: repo.name, name, owner: { login: owner }, default_branch: "main", fork: false },
    organization: { login: owner },
    sender: personJson(by),
    ...(action === undefined ? {} : { action }),
    ...change,
  });
  // A suspended App hears nothing, and GitHub does not send it later: only its owner can ask for it again (`redeliver`).
  (suspended ? repo.missed : repo.deliveries).push({ id: `world-${next()}`, event, payload });
}

import type { Permissions } from "~/modules/github/types.ts";
import type { Outside } from "../types.ts";

/* GitHub's REST, as the manager uses it: each call with a token made for it, for one repo, with only the rights it needs. */

const API = "https://api.github.com";

export type Said =
  | { readonly _tag: "Said"; readonly status: number; readonly value: unknown }
  | { readonly _tag: "Cannot"; readonly why: string };

export const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
export const textOf = (value: unknown): string => (typeof value === "string" ? value : "");
export const numberOf = (value: unknown): number => (typeof value === "number" ? value : 0);

/** One call. `Cannot` is a token that could not be made: the App is gone from the repo, or never set up. */
export async function gh(outside: Outside, repo: string, rights: Permissions, method: string, path: string, body?: unknown): Promise<Said> {
  const installation = await outside.installation();
  if (installation === undefined) return { _tag: "Cannot", why: "GitHub is not connected to this workspace." };
  const made = await outside.github.token(installation, repo, rights);
  if (made._tag === "Failed") return { _tag: "Cannot", why: `GitHub would not give access to ${repo}: ${made.reason}` };
  try {
    const response = await outside.fetch(`${API}/repos/${repo}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${made.token.token}`,
        accept: "application/vnd.github+json",
        "user-agent": "co-worker",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const value: unknown = await response.json().catch(() => undefined);
    return { _tag: "Said", status: response.status, value };
  } catch (error) {
    return { _tag: "Cannot", why: `GitHub could not be reached: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export interface Comment {
  readonly id: number;
  readonly by: string;
  readonly text: string;
}

const commentOf = (one: unknown): Comment | undefined =>
  isRecord(one)
    ? { id: numberOf(one["id"]), by: isRecord(one["user"]) ? textOf(one["user"]["login"]) : "", text: textOf(one["body"]) }
    : undefined;

/** The comments of an issue or a pull request, oldest first. */
export async function commentsOf(outside: Outside, repo: string, number: number): Promise<readonly Comment[] | undefined> {
  const said = await gh(outside, repo, { issues: "read" }, "GET", `/issues/${number}/comments`);
  if (said._tag === "Cannot" || said.status !== 200 || !Array.isArray(said.value)) return undefined;
  return said.value.flatMap((one) => commentOf(one) ?? []);
}

export interface IssueRead {
  readonly title: string;
  readonly body: string;
  readonly by: string;
  readonly labels: readonly string[];
}

export async function issueOf(outside: Outside, repo: string, number: number): Promise<IssueRead | undefined> {
  const said = await gh(outside, repo, { issues: "read" }, "GET", `/issues/${number}`);
  if (said._tag === "Cannot" || said.status !== 200 || !isRecord(said.value)) return undefined;
  const { value } = said;
  return {
    title: textOf(value["title"]),
    body: textOf(value["body"]),
    by: isRecord(value["user"]) ? textOf(value["user"]["login"]) : "",
    labels: Array.isArray(value["labels"]) ? value["labels"].flatMap((one) => (isRecord(one) ? [textOf(one["name"])] : [])) : [],
  };
}

/** The repo's default branch, as GitHub says it; `main` when it cannot be asked. */
export async function defaultBranch(outside: Outside, repo: string): Promise<string> {
  const said = await gh(outside, repo, { metadata: "read" }, "GET", "");
  return said._tag === "Said" && isRecord(said.value) && textOf(said.value["default_branch"]) !== ""
    ? textOf(said.value["default_branch"])
    : "main";
}

const MARK = (key: string): string => `<!-- co-worker:${key} -->`;

/** A comment, once by its key: a mark at the end of it says that it was made, so asking again finds it. */
export async function commentOnce(
  outside: Outside,
  repo: string,
  number: number,
  text: string,
  key: string,
): Promise<{ readonly _tag: "Said"; readonly id: number } | { readonly _tag: "Cannot"; readonly why: string }> {
  const there = await commentsOf(outside, repo, number);
  const found = there?.find((one) => one.text.includes(MARK(key)));
  if (found !== undefined) return { _tag: "Said", id: found.id };
  const said = await gh(outside, repo, { issues: "write" }, "POST", `/issues/${number}/comments`, { body: `${text}\n\n${MARK(key)}` });
  if (said._tag === "Cannot") return said;
  if (said.status !== 201 || !isRecord(said.value)) return { _tag: "Cannot", why: `GitHub answered ${said.status} to the comment.` };
  return { _tag: "Said", id: numberOf(said.value["id"]) };
}

import type { CommentRecord, LineRecord, ReviewRecord, TalkRecord } from "../records.ts";
import { isJson, list, num, str, timeAt, whoAt } from "./json.ts";

/* What is said on an item: a comment, a comment on a line, a review, and the talk that lines make. */

export function commentFrom(value: unknown, number: number, gone: boolean, askedAt?: number): CommentRecord | undefined {
  const id = num(value, "id");
  const updated = timeAt(value, "updated_at", "created_at");
  if (!isJson(value) || id === undefined || updated === undefined) return undefined;
  return {
    is: "comment",
    at: askedAt === undefined ? updated : Math.max(updated, askedAt),
    rank: gone ? 1 : 0,
    id,
    number,
    by: whoAt(value, "user"),
    body: str(value, "body") ?? "",
    gone,
  };
}

export function lineFrom(value: unknown, number: number, gone: boolean, askedAt?: number): LineRecord | undefined {
  const id = num(value, "id");
  const updated = timeAt(value, "updated_at", "created_at");
  if (!isJson(value) || id === undefined || updated === undefined) return undefined;
  return {
    is: "line",
    at: askedAt === undefined ? updated : Math.max(updated, askedAt),
    rank: gone ? 1 : 0,
    id,
    number,
    by: whoAt(value, "user"),
    body: str(value, "body") ?? "",
    path: str(value, "path") ?? "",
    line: num(value, "line") ?? null,
    answers: num(value, "in_reply_to_id") ?? null,
    review: num(value, "pull_request_review_id") ?? null,
    gone,
  };
}

const SAYS: Readonly<Record<string, ReviewRecord["says"]>> = {
  approved: "approved",
  changes_requested: "changes",
  commented: "commented",
  dismissed: "dismissed",
};

export function reviewFrom(value: unknown, number: number, askedAt?: number): ReviewRecord | undefined {
  const id = num(value, "id");
  const given = timeAt(value, "submitted_at", "updated_at", "created_at");
  if (!isJson(value) || id === undefined || given === undefined) return undefined;
  const says = SAYS[(str(value, "state") ?? "").toLowerCase()] ?? "commented";
  // A dismissed review keeps the time it was given, so it is later than the one that was given: by rank.
  const at = askedAt === undefined ? given : Math.max(given, askedAt);
  return {
    is: "review",
    at,
    rank: says === "dismissed" ? 1 : 0,
    id,
    number,
    by: whoAt(value, "user"),
    says,
    sha: str(value, "commit_id") ?? null,
    body: str(value, "body") ?? "",
  };
}

/** GitHub gives a talk no time: it is its item's. */
export function talkFrom(thread: unknown, number: number, settled: boolean, at: number): TalkRecord | undefined {
  const first = list(thread, "comments")
    .map((one) => num(one, "id"))
    .find((id) => id !== undefined);
  return first === undefined ? undefined : { is: "talk", at, rank: 0, number, first, settled };
}

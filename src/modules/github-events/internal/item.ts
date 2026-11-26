import type { ItemRecord, PullRecord } from "../records.ts";
import { bool, isJson, names, num, obj, str, timeAt, whoAt } from "./json.ts";

/* An issue, or a pull request, as GitHub shows it: the same fields in a delivery and in an answer. */

const REASONS: Readonly<Record<string, ItemRecord["closedAs"]>> = {
  completed: "completed",
  not_planned: "not planned",
  duplicate: "duplicate",
};

/** `at`: when it was asked, for an answer. A record from an answer is at least as new as the question. */
export function itemFrom(value: unknown, deleted: boolean, askedAt?: number): ItemRecord | undefined {
  const number = num(value, "number");
  const updated = timeAt(value, "updated_at", "created_at");
  if (!isJson(value) || number === undefined || updated === undefined) return undefined;
  const pull = obj(value, "pull_request") !== undefined || obj(value, "head") !== undefined;
  const at = askedAt === undefined ? updated : Math.max(updated, askedAt);
  const labels = names(value, "labels", "name").toSorted();
  const assignees = names(value, "assignees", "login");
  return {
    is: "item",
    at,
    // In one second, closed is later than what it was closed after; reopening takes a person longer.
    rank: deleted ? 2 : str(value, "state") === "open" ? 0 : 1,
    number,
    pull,
    open: str(value, "state") === "open",
    closedAs: pull ? null : (REASONS[str(value, "state_reason") ?? ""] ?? null),
    title: str(value, "title") ?? "",
    body: str(value, "body") ?? "",
    labels,
    assignees,
    by: whoAt(value, "user"),
    gone: deleted,
  };
}

export function pullFrom(value: unknown, askedAt?: number): PullRecord | undefined {
  const number = num(value, "number");
  const updated = timeAt(value, "updated_at", "created_at");
  const head = obj(value, "head");
  const base = obj(value, "base");
  const sha = str(head, "sha");
  if (!isJson(value) || number === undefined || updated === undefined || sha === undefined) return undefined;
  const merged = bool(value, "merged") === true || typeof value["merged_at"] === "string";
  const mergedBy = obj(value, "merged_by");
  const at = askedAt === undefined ? updated : Math.max(updated, askedAt);
  return {
    is: "pull",
    at,
    rank: merged ? 1 : 0,
    number,
    draft: bool(value, "draft") === true,
    merged,
    mergedBy: merged && mergedBy !== undefined ? whoAt(value, "merged_by") : null,
    mergeSha: str(value, "merge_commit_sha") ?? null,
    head: { ref: str(head, "ref") ?? "", sha, repo: str(obj(head, "repo"), "full_name") ?? null },
    base: { ref: str(base, "ref") ?? "", sha: str(base, "sha") ?? "" },
    mergeable: bool(value, "mergeable") ?? null,
    asked: names(value, "requested_reviewers", "login"),
  };
}

/** A pull request carries both: the issue it also is, and the pull request. */
export function recordsOfPull(value: unknown, askedAt?: number): readonly (ItemRecord | PullRecord)[] {
  return [itemFrom(value, false, askedAt), pullFrom(value, askedAt)].filter((one) => one !== undefined);
}

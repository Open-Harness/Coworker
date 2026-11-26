import type { BranchRecord, CheckRecord } from "../records.ts";
import { bool, isJson, num, obj, str, timeAt, timeOf, whoAt, whoOf, type Json } from "./json.ts";

/* A check run, a commit status, and a push. */

const STATES: Readonly<Record<string, CheckRecord["state"]>> = { completed: "done", in_progress: "running" };
const ENDS: Readonly<Record<string, NonNullable<CheckRecord["ended"]>>> = {
  success: "passed",
  neutral: "passed",
  skipped: "passed",
  failure: "failed",
  timed_out: "failed",
  action_required: "failed",
  startup_failure: "failed",
  cancelled: "neither",
  stale: "neither",
};
const RANKS: Readonly<Record<CheckRecord["state"], number>> = { waits: 0, running: 1, done: 2 };

const clip = (text: string): string => (text.length > 600 ? `${text.slice(0, 600)}…` : text);

export function checkRunFrom(value: unknown, askedAt?: number): CheckRecord | undefined {
  const id = num(value, "id");
  const sha = str(value, "head_sha");
  const when = timeAt(value, "completed_at", "started_at", "created_at");
  if (!isJson(value) || id === undefined || sha === undefined || when === undefined) return undefined;
  const state = STATES[str(value, "status") ?? ""] ?? "waits";
  const ended = state === "done" ? (ENDS[str(value, "conclusion") ?? ""] ?? "neither") : null;
  const output = obj(value, "output");
  const says = clip([str(output, "title"), str(output, "summary")].filter((part) => part !== undefined && part !== "").join(": "));
  const app = obj(value, "app");
  return {
    is: "check",
    at: askedAt === undefined ? when : Math.max(when, askedAt),
    rank: RANKS[state],
    id,
    sha,
    app: str(app, "slug") ?? str(app, "name") ?? "unknown",
    name: str(value, "name") ?? "",
    state,
    ended,
    says: says === "" ? (str(value, "conclusion") ?? "") : says,
    link: str(value, "html_url") ?? str(value, "details_url") ?? null,
  };
}

/** A commit status is a check that is run once and is `pending`, then `success` or `failure`. */
export function statusFrom(value: unknown): CheckRecord | undefined {
  const id = num(value, "id");
  const sha = str(value, "sha");
  const when = timeAt(value, "updated_at", "created_at");
  const state = str(value, "state");
  if (!isJson(value) || id === undefined || sha === undefined || when === undefined) return undefined;
  const done = state === "success" || state === "failure" || state === "error";
  return {
    is: "check",
    at: when,
    rank: done ? 2 : 1,
    id,
    sha,
    app: "status",
    name: str(value, "context") ?? "",
    state: done ? "done" : "running",
    ended: done ? (state === "success" ? "passed" : "failed") : null,
    says: str(value, "description") ?? "",
    link: str(value, "target_url") ?? null,
  };
}

const NONE = /^0+$/u;
export function branchFrom(value: Json): BranchRecord | undefined {
  const ref = str(value, "ref");
  const repo = obj(value, "repository");
  const at = timeOf(obj(value, "head_commit")?.["timestamp"]) ?? timeOf(repo?.["pushed_at"]);
  if (ref === undefined || at === undefined) return undefined;
  const after = str(value, "after");
  const branch = ref.replace(/^refs\/heads\//u, "");
  return {
    is: "branch",
    at,
    rank: 0,
    ref: branch,
    sha: after === undefined || NONE.test(after) || bool(value, "deleted") === true ? null : after,
    forced: bool(value, "forced") === true,
    main: ref === `refs/heads/${str(repo, "default_branch") ?? "main"}`,
    by: whoOf(obj(value, "sender")) ?? whoAt(value, "pusher"),
  };
}

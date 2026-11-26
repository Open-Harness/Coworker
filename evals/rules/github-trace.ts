import { createRequire } from "node:module";
import pulls from "./data/real/pulls.json" with { type: "json" };

/*
 * Deliveries as GitHub sends them, made from what really happened on real pull requests (`data/real/pulls.json`): the
 * body of each is GitHub's own published example, with the pull request as it was at that moment put in.
 */

export type Json = Record<string, any>;
export interface Delivery {
  readonly event: string;
  readonly payload: Json;
}
interface Happened {
  readonly is: string;
  readonly at: string;
  readonly by?: string;
  readonly sha?: string;
  readonly id?: number;
  readonly state?: string;
  readonly label?: string;
  readonly review?: number;
  readonly of?: string;
}
export interface Trace {
  readonly number: number;
  readonly by: string;
  readonly at: string;
  readonly ends: { readonly state: string; readonly merged: boolean; readonly draft: boolean; readonly head: string; readonly labels: readonly string[]; readonly at: string };
  readonly events: readonly Happened[];
}
export const TRACES = pulls as unknown as readonly Trace[];
export const REPO = "acme/tool";

export const EXAMPLES = createRequire(import.meta.url)("@octokit/webhooks-examples") as readonly { name: string; examples: readonly Json[] }[];
export function example(event: string, action?: string): Json {
  const all = EXAMPLES.find(({ name }) => name === event)?.examples ?? [];
  const found = action === undefined ? all[0] : all.find((one) => one["action"] === action);
  if (found === undefined) throw new Error(`no example of ${event}.${action ?? ""}`);
  return structuredClone(found);
}

export const user = (login = "ghost") => ({ login, id: [...login].reduce((sum, c) => sum * 31 + c.charCodeAt(0), 7) % 1_000_000, type: /bot/u.test(login) ? "Bot" : "User" });
const repository = { ...example("issues", "opened")["repository"], full_name: REPO, name: "tool", default_branch: "main" };

/** A pull request, or an issue, as it is now. */
export interface Now {
  readonly number: number;
  readonly by: string;
  readonly title?: string;
  readonly body?: string;
  state: string;
  merged: boolean;
  draft: boolean;
  head: string;
  labels: string[];
  at: string;
  asked: string[];
  mergeable?: boolean | null;
}
export const pullJson = (now: Now): Json => ({
  ...example("pull_request", "opened")["pull_request"],
  number: now.number, title: now.title ?? "A title", body: now.body ?? "", state: now.state, draft: now.draft, merged: now.merged, merged_at: now.merged ? now.at : null,
  merged_by: now.merged ? user("person-9") : null, merge_commit_sha: now.merged ? "feedfacefeed" : null, user: user(now.by), updated_at: now.at,
  labels: now.labels.map((name) => ({ name })), requested_reviewers: now.asked.map(user), mergeable: now.mergeable ?? null, assignees: [],
  head: { ref: "a-branch", sha: now.head, repo: { full_name: REPO, fork: false } }, base: { ref: "main", sha: "ba5eba5eba5e", repo: { full_name: REPO, fork: false } },
});
export const issueJson = (now: Now, pull = true): Json => ({
  ...example("issues", "opened")["issue"],
  number: now.number, title: now.title ?? "A title", body: now.body ?? "", state: now.state, user: user(now.by), updated_at: now.at, labels: now.labels.map((name) => ({ name })), assignees: [],
  ...(pull ? { pull_request: { url: "x" } } : {}),
});
export const delivery = (event: string, action: string | null, by: string, more: Json): Delivery => ({
  event,
  payload: { ...(action === null ? {} : { action }), repository, installation: { id: 77 }, sender: user(by), ...more },
});

/** What GitHub would have sent, in order. */
export function deliveries(trace: Trace): readonly Delivery[] {
  const commits = trace.events.filter(({ is }) => is === "committed");
  const first = [...commits].reverse().find(({ at }) => at <= trace.at) ?? commits[0];
  const now: Now = { number: trace.number, by: trace.by, state: "open", merged: false, draft: false, head: first?.sha ?? "", labels: [], at: trace.at, asked: [] };
  // It began as a draft when the first thing about that says it became ready, or it ended as one and was never made one.
  const turns = trace.events.filter(({ is }) => is === "ready_for_review" || is === "convert_to_draft");
  now.draft = turns[0] === undefined ? trace.ends.draft : turns[0].is === "ready_for_review";
  const reviews = new Map<number, Json>();
  const out: Delivery[] = [];
  const pull = (action: string, by: string, more: Json = {}) => out.push(delivery("pull_request", action, by, { number: now.number, pull_request: pullJson(now), ...more }));
  pull("opened", trace.by);
  const merges = trace.events.some(({ is }) => is === "merged");
  for (const one of trace.events) {
    const by = one.by ?? trace.by;
    if (one.is === "committed" && (one.at <= trace.at || one.sha === now.head)) continue;
    now.at = one.at > now.at ? one.at : now.at;
    if (one.is === "committed" || one.is === "head_ref_force_pushed") {
      now.head = one.sha ?? now.head;
      pull("synchronize", by);
    } else if (one.is === "labeled") {
      now.labels = [...now.labels, one.label ?? ""];
      pull("labeled", by, { label: { name: one.label } });
    } else if (one.is === "unlabeled") {
      now.labels = now.labels.filter((label) => label !== one.label);
      pull("unlabeled", by, { label: { name: one.label } });
    } else if (one.is === "ready_for_review" || one.is === "convert_to_draft") {
      now.draft = one.is === "convert_to_draft";
      pull(now.draft ? "converted_to_draft" : "ready_for_review", by);
    } else if (one.is === "review_requested") {
      now.asked = [...now.asked, one.of ?? ""];
      pull("review_requested", by, { requested_reviewer: user(one.of) });
    } else if (one.is === "closed") {
      now.state = "closed";
      now.merged = merges && trace.ends.merged;
      pull("closed", by);
    } else if (one.is === "reopened") {
      now.state = "open";
      pull("reopened", by);
    } else if (one.is === "renamed") pull("edited", by, { changes: { title: { from: "Another title" } } });
    else if (one.is === "commented") {
      const comment = { ...example("issue_comment", "created")["comment"], id: one.id, user: user(by), body: `Comment ${one.id}`, created_at: one.at, updated_at: one.at };
      out.push(delivery("issue_comment", "created", by, { issue: issueJson(now), comment }));
    } else if (one.is === "reviewed") {
      const review = { ...example("pull_request_review", "submitted")["review"], id: one.id, user: user(by), body: "", state: one.state, commit_id: one.sha, submitted_at: one.at };
      reviews.set(one.id ?? 0, review);
      out.push(delivery("pull_request_review", "submitted", by, { pull_request: pullJson(now), review: { ...review, state: one.state === "dismissed" ? "approved" : one.state } }));
    } else if (one.is === "review_dismissed") {
      const review = reviews.get(one.review ?? 0);
      if (review !== undefined) out.push(delivery("pull_request_review", "dismissed", by, { pull_request: pullJson(now), review: { ...review, state: "dismissed" } }));
    }
  }
  return out;
}

/** The same shuffle for the same seed. */
export function shuffled<T>(all: readonly T[], seed: number): readonly T[] {
  const out = [...all];
  let state = seed * 2_654_435_761 + 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state ^ (state >>> 15), 2_246_822_519) + 0x9e37_79b9) >>> 0;
    const j = state % (i + 1);
    const [a, b] = [out[i], out[j]];
    if (a !== undefined && b !== undefined) [out[i], out[j]] = [b, a];
  }
  return out;
}

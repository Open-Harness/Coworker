import { describe, expect, it } from "vitest";
import { githubEvents as github } from "~/modules/github-events/service.ts";
import type { Kept, Read, Told } from "~/modules/github-events/types.ts";
import { delivery, example, issueJson, pullJson, user, type Delivery, type Json, type Now } from "./github-trace.ts";

/* What is true of an issue or a pull request, one thing at a time. */

const us = { login: "juno-test[bot]", mention: "@juno", label: "juno" };
const T = (minute: number, second = 0): string => new Date(Date.UTC(2026, 10, 25, 9, minute, second)).toISOString().replace(".000", "");
const pull = (more: Partial<Now> = {}): Now => ({ number: 7, by: "ama", state: "open", merged: false, draft: false, head: "aaaa", labels: [], at: T(0), asked: [], ...more });
const pr = (action: string, more: Partial<Now> = {}, by = "ama", extra: Json = {}): Delivery => delivery("pull_request", action, by, { number: 7, pull_request: pullJson(pull(more)), ...extra });
const issue = (action: string, more: Partial<Now> = {}, by = "ama", extra: Json = {}): Delivery => delivery("issues", action, by, { issue: issueJson(pull(more), false), ...extra });
const said = (id: number, body: string, at: string, by = "bo", action = "created"): Delivery =>
  delivery("issue_comment", action, by, { issue: issueJson(pull({ at })), comment: { ...example("issue_comment", "created")["comment"], id, body, user: user(by), created_at: at, updated_at: at } });
const review = (id: number, state: string, at: string, by = "bo", sha = "aaaa", body = ""): Delivery =>
  delivery("pull_request_review", state === "dismissed" ? "dismissed" : "submitted", by, { pull_request: pullJson(pull({ at, head: "aaaa" })), review: { ...example("pull_request_review", "submitted")["review"], id, state, user: user(by), submitted_at: at, commit_id: sha, body } });
const line = (id: number, body: string, at: string, by = "bo", answers?: number): Delivery =>
  delivery("pull_request_review_comment", "created", by, { pull_request: pullJson(pull({ at })), comment: { ...example("pull_request_review_comment", "created")["comment"], id, body, user: user(by), path: "src/a.ts", line: 3, created_at: at, updated_at: at, ...(answers === undefined ? {} : { in_reply_to_id: answers }) } });
const talk = (first: number, action: string, at: string): Delivery =>
  delivery("pull_request_review_thread", action, "bo", { pull_request: pullJson(pull({ at })), thread: { node_id: "PRRT_x", comments: [{ ...example("pull_request_review_comment", "created")["comment"], id: first, path: "src/a.ts", user: user("bo"), created_at: T(1), updated_at: T(1) }] } });
const check = (id: number, status: string, conclusion: string | null, sha = "aaaa", name = "test"): Delivery =>
  delivery("check_run", status === "completed" ? "completed" : "created", "ama", { check_run: { ...example("check_run", "completed")["check_run"], id, name, head_sha: sha, status, conclusion, app: { slug: "github-actions" }, started_at: T(5), completed_at: status === "completed" ? T(5) : null, output: { title: "3 failed", summary: "a, b and c" }, pull_requests: [] } });

const read = (one: Delivery): Read => github.read(one.event, one.payload, us);
const keep = (was: Kept, ...more: readonly Delivery[]): Kept => more.reduce((all, one) => {
  const got = read(one);
  return got._tag === "Heard" || got._tag === "Noise" ? github.keep(all, got.records) : all;
}, was);
const state = (...all: readonly Delivery[]) => github.stateOf(keep({}, ...all), 7, us);
const told = (before: readonly Delivery[], ...after: readonly Delivery[]): readonly Told[] => github.told(keep({}, ...before), keep({}, ...before, ...after), 7, us);

describe("hearing", () => {
  it("rules:github-events/says-what-was-heard-as-the-connector-calls-it", () => {
    const events = (all: readonly Delivery[]) => all.map((one) => { const got = read(one); return got._tag === "Heard" ? got.event : got._tag; });
    expect(events([issue("opened"), issue("labeled", {}, "ama", { label: { name: "bug" } }), issue("closed", { state: "closed" }), said(1, "hello", T(1)), pr("opened"), pr("closed", { state: "closed" }), pr("closed", { state: "closed", merged: true }), review(2, "approved", T(1)), line(3, "why?", T(1)), check(4, "completed", "success")]))
      .toEqual(["issue", "label", "closed", "comment", "pull_request", "closed", "merged", "review", "line_comment", "check"]);
    expect(events([issue("pinned"), issue("milestoned"), said(1, "hello", T(1), "bo", "edited"), check(4, "in_progress", null), talk(3, "resolved", T(2)), pr("assigned")])).toEqual(["Noise", "Noise", "Noise", "Noise", "Noise", "Noise"]);
  });
  it("rules:github-events/a-mention-or-our-label-is-addressed-and-a-quote-is-not", () => {
    const addressed = (one: Delivery) => { const got = read(one); return got._tag === "Heard" && got.addressed; };
    expect([said(1, "@juno can you look?", T(1)), said(1, "Hey @Juno!", T(1)), issue("opened", { body: "cc @juno" }), issue("labeled", {}, "ama", { label: { name: "juno" } })].map(addressed)).toEqual([true, true, true, true]);
    expect([said(1, "> @juno can you look?\n\nNo", T(1)), said(1, "`@juno` is how", T(1)), said(1, "mail me@juno.example", T(1)), said(1, "@junor look", T(1)), said(1, "@juno-dev look", T(1)), issue("labeled", {}, "ama", { label: { name: "bug" } })].map(addressed)).toEqual([false, false, false, false, false, false]);
  });
  it("rules:github-events/ours-coming-back-is-noise-and-its-records-are-kept", () => {
    const got = read(said(9, "Done.", T(3), us.login));
    expect(got).toMatchObject({ _tag: "Noise" });
    expect(told([pr("opened")], said(9, "Done.", T(3), us.login))).toEqual([]);
    expect(github.stateOf(keep({}, pr("opened"), pr("closed", { state: "closed", merged: true, at: T(4) }, us.login)), 7, us)?.is).toBe("merged");
  });
  it("rules:github-events/the-same-thing-heard-twice-has-the-same-key-and-another-another", () => {
    const same = (one: Delivery) => { const got = read(one); return got._tag === "Heard" ? got.same : ""; };
    expect(same(said(1, "hello", T(1)))).toBe(same(said(1, "hello", T(1))));
    const keys = [said(1, "a", T(1)), said(2, "a", T(1)), review(3, "approved", T(1)), review(3, "dismissed", T(1)), line(1, "a", T(1)), check(5, "completed", "success"), pr("opened"), pr("synchronize", { head: "bbbb", at: T(2) }), pr("synchronize", { head: "cccc", at: T(2) }), pr("closed", { state: "closed", at: T(3) }), pr("reopened", { at: T(4) }), pr("closed", { state: "closed", at: T(5) })].map(same);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain("");
  });
  it("rules:github-events/what-it-says-it-closes-in-this-repo-only", () => {
    expect(github.closes("Fixes #12, closes: #13 and resolves https://github.com/acme/tool/issues/14", "acme/tool")).toEqual([12, 13, 14]);
    expect(github.closes("See #12. Fixes other/repo#3. Unfixes #4", "acme/tool")).toEqual([]);
  });
});

describe("state", () => {
  it("rules:github-events/draft-open-closed-merged-and-open-again", () => {
    expect(state(pr("opened", { draft: true }))?.is).toBe("draft");
    expect(state(pr("opened", { draft: true }), pr("ready_for_review", { at: T(1) }))?.is).toBe("open");
    expect(state(pr("opened"), pr("closed", { state: "closed", at: T(2) }), pr("reopened", { at: T(3) }))?.is).toBe("open");
    // Closed and merged in one second: merged, in either order.
    const [closed, merged] = [pr("closed", { state: "closed", at: T(2) }), pr("closed", { state: "closed", merged: true, at: T(2) })];
    expect([state(pr("opened"), closed, merged)?.is, state(merged, closed, pr("opened"))?.is]).toEqual(["merged", "merged"]);
    expect(state(issue("opened"), delivery("issues", "closed", "ama", { issue: { ...issueJson(pull({ state: "closed", at: T(2) }), false), state_reason: "not_planned" } }))).toMatchObject({ is: "closed", closedAs: "not planned", pull: false });
    expect(state(issue("opened"), issue("deleted", { at: T(2) }))?.is).toBe("gone");
  });
  it("rules:github-events/checks-are-of-the-head-and-the-newest-of-each-name", () => {
    expect(state(pr("opened"))?.checks.is).toBe("none");
    expect(state(pr("opened"), check(1, "in_progress", null))?.checks.is).toBe("running");
    // Queued and completed carry the same second; completed stays, whichever came last.
    expect([state(pr("opened"), check(1, "completed", "failure"), check(1, "queued", null))?.checks.is, state(pr("opened"), check(1, "queued", null), check(1, "completed", "failure"))?.checks.is]).toEqual(["failed", "failed"]);
    // Run again it has a new id: the newer counts, whichever came last.
    expect([state(pr("opened"), check(1, "completed", "failure"), check(2, "completed", "success"))?.checks.is, state(pr("opened"), check(2, "completed", "success"), check(1, "completed", "failure"))?.checks.is]).toEqual(["passed", "passed"]);
    expect(state(pr("opened"), check(1, "completed", "failure"), pr("synchronize", { head: "bbbb", at: T(6) }))?.checks).toEqual({ is: "none", failed: [] });
    expect(state(check(1, "completed", "failure"), pr("opened"))?.checks).toMatchObject({ is: "failed", failed: [{ name: "test", id: 1 }] });
    for (const passes of ["success", "neutral", "skipped"]) expect(state(pr("opened"), check(1, "completed", passes))?.checks.is, passes).toBe("passed");
    for (const fails of ["failure", "timed_out", "action_required"]) expect(state(pr("opened"), check(1, "completed", fails))?.checks.is, fails).toBe("failed");
    for (const [one, two] of [[1, 2], [9, 10]] as const) {
      expect([state(pr("opened"), check(one, "completed", "success"), check(two, "completed", "failure"))?.checks.is, state(pr("opened"), check(two, "completed", "success"), check(one, "completed", "failure"))?.checks.is]).toEqual(["failed", "passed"]);
    }
    expect(state(pr("opened"), check(1, "completed", "cancelled"))?.checks).toEqual({ is: "none", failed: [] });
    // Cancelled says nothing; the other one is what there is.
    expect(state(pr("opened"), check(1, "completed", "cancelled"), check(2, "completed", "success", "aaaa", "lint"))?.checks.is).toBe("passed");
    expect(state(pr("opened"), check(1, "completed", "success"), check(2, "completed", "failure", "aaaa", "lint"))?.checks.is).toBe("failed");
  });
  it("rules:github-events/a-check-finds-its-pull-request-by-its-commit", () => {
    const all = keep({}, pr("opened"), check(1, "completed", "failure"));
    expect(github.withHead(all, "aaaa")).toEqual([7]);
    expect(github.withHead(keep(all, pr("synchronize", { head: "bbbb", at: T(6) })), "aaaa")).toEqual([]);
    expect(github.withHead(keep(all, pr("closed", { state: "closed", at: T(6) })), "aaaa")).toEqual([]);
  });
  it("rules:github-events/a-comment-does-not-take-a-review-away-and-a-dismissal-does", () => {
    const says = (...all: readonly Delivery[]) => state(pr("opened"), ...all)?.reviews;
    expect(says(review(1, "changes_requested", T(1)), review(2, "commented", T(2)))).toEqual([{ who: "bo", says: "changes", onHead: true }]);
    expect(says(review(1, "changes_requested", T(1)), review(2, "approved", T(2)))).toEqual([{ who: "bo", says: "approved", onHead: true }]);
    expect(says(review(2, "approved", T(2)), review(1, "changes_requested", T(1)))).toEqual([{ who: "bo", says: "approved", onHead: true }]);
    // GitHub leaves a dismissed review the time it was made at.
    expect(says(review(1, "approved", T(1)), review(1, "dismissed", T(1)))).toEqual([]);
    expect(says(review(1, "dismissed", T(1)), review(1, "approved", T(1)))).toEqual([]);
    expect(says(review(1, "approved", T(1), "bo", "0000"))).toEqual([{ who: "bo", says: "approved", onHead: false }]);
  });
  it("rules:github-events/says-who-it-waits-for", () => {
    const waits = (...all: readonly Delivery[]) => state(pr("opened"), ...all)?.waits;
    expect(waits()).toBe("review");
    expect(waits(check(1, "in_progress", null))).toBe("checks");
    expect(waits(check(1, "completed", "failure"), review(2, "approved", T(2)))).toBe("us");
    expect(waits(review(1, "changes_requested", T(1)))).toBe("us");
    expect(waits(review(1, "changes_requested", T(1), "bo", "0000"))).toBe("review");
    expect(waits(review(1, "approved", T(1)))).toBe("merge");
    expect(waits(review(1, "approved", T(1)), review(2, "changes_requested", T(2), "chidi"))).toBe("us");
    expect(waits(pr("edited", { mergeable: false, at: T(1) }))).toBe("us");
    expect(waits(pr("closed", { state: "closed", at: T(1) }))).toBe("nothing");
    expect(state(issue("opened"))?.waits).toBe("us");
  });
  it("rules:github-events/a-talk-on-a-line-waits-for-us-until-it-is-answered-or-settled", () => {
    const at = (...all: readonly Delivery[]) => { const now = state(pr("opened"), ...all); return [now?.talks, now?.waits]; };
    expect(at(line(3, "why?", T(1)))).toEqual([1, "us"]);
    expect(at(line(3, "why?", T(1)), line(4, "Because.", T(2), us.login, 3))).toEqual([1, "review"]);
    expect(at(line(3, "why?", T(1)), line(4, "Because.", T(2), us.login, 3), line(5, "And this?", T(3), "bo", 3))).toEqual([1, "us"]);
    expect(at(line(3, "why?", T(1)), talk(3, "resolved", T(2)))).toEqual([0, "review"]);
    expect(at(talk(3, "unresolved", T(3)), line(3, "why?", T(1)), talk(3, "resolved", T(2)))).toEqual([1, "us"]);
  });
  it("rules:github-events/two-of-one-second-that-disagree-are-not-sure-until-asked", () => {
    const [one, two] = [pr("labeled", { labels: ["a"], at: T(1) }), pr("labeled", { labels: ["b"], at: T(1) })];
    const [left, right] = [keep({}, pr("opened"), one, two), keep({}, two, one, pr("opened"))];
    expect(left).toEqual(right);
    expect(github.stateOf(left, 7, us)?.sure).toBe(false);
    expect(github.stateOf(keep({}, pr("opened"), one, one), 7, us)?.sure).toBe(true);
    const asked = github.keep(left, github.asked(7, { pull: pullJson(pull({ labels: ["b"], at: T(1) })) }, Date.parse(T(2))));
    expect(github.stateOf(asked, 7, us)).toMatchObject({ sure: true, labels: ["b"] });
    // Known only from a comment: a pull request whose head nobody has seen.
    expect(state(said(1, "hello", T(1)))?.sure).toBe(false);
    expect(github.stateOf({}, 7, us)).toBeUndefined();
  });
});

describe("what became true", () => {
  it("rules:github-events/first-seen-is-not-news", () => {
    expect(told([], pr("closed", { state: "closed", merged: true }))).toEqual([]);
    expect(told([pr("opened")], pr("opened"))).toEqual([]);
  });
  it("rules:github-events/a-word-a-review-a-check-a-push-a-conflict-an-end", () => {
    expect(told([pr("opened")], said(1, "Any news?", T(1)))).toMatchObject([{ is: "said", where: "thread", id: 1, text: "Any news?", number: 7 }]);
    expect(told([pr("opened")], line(3, "why?", T(1)))).toMatchObject([{ is: "said", where: "line", id: 3, path: "src/a.ts", line: 3 }]);
    expect(told([pr("opened")], review(1, "changes_requested", T(1), "bo", "aaaa", "Name it better"))).toMatchObject([{ is: "reviewed", says: "changes", text: "Name it better", onHead: true }]);
    expect(told([pr("opened")], review(1, "approved", T(1), "bo", "0000"))).toMatchObject([{ is: "reviewed", says: "approved", onHead: false }]);
    expect(told([pr("opened"), review(1, "approved", T(1))], review(1, "dismissed", T(1)))).toMatchObject([{ is: "taken back", who: "bo" }]);
    expect(told([pr("opened")], pr("synchronize", { head: "bbbb", at: T(1) }))).toMatchObject([{ is: "moved", sha: "bbbb" }]);
    expect(told([pr("opened")], pr("edited", { mergeable: false, at: T(1) }))).toMatchObject([{ is: "conflict" }]);
    expect(told([pr("opened")], pr("closed", { state: "closed", merged: true, at: T(1) }))).toMatchObject([{ is: "ended", as: "merged", who: "person-9" }]);
    expect(told([pr("opened")], pr("closed", { state: "closed", at: T(1) }))).toMatchObject([{ is: "ended", as: "closed" }]);
    expect(told([pr("opened"), pr("closed", { state: "closed", at: T(1) })], pr("reopened", { at: T(2) }))).toMatchObject([{ is: "opened again" }]);
    expect(told([pr("opened", { draft: true })], pr("ready_for_review", { at: T(1) }))).toMatchObject([{ is: "ready" }]);
  });
  it("rules:github-events/checks-are-told-when-all-are-in-or-one-failed", () => {
    expect(told([pr("opened"), check(2, "in_progress", null, "aaaa", "lint")], check(1, "completed", "success"))).toEqual([]);
    expect(told([pr("opened"), check(1, "completed", "success"), check(2, "in_progress", null, "aaaa", "lint")], check(2, "completed", "success", "aaaa", "lint"))).toMatchObject([{ is: "checked", ended: "passed", sha: "aaaa" }]);
    expect(told([pr("opened"), check(2, "in_progress", null, "aaaa", "lint")], check(1, "completed", "failure"))).toMatchObject([{ is: "checked", ended: "failed", failed: [{ name: "test", says: expect.stringContaining("3 failed") }] }]);
    expect(told([pr("opened"), check(1, "completed", "failure")], check(1, "completed", "failure"))).toEqual([]);
    expect(told([pr("opened"), pr("synchronize", { head: "bbbb", at: T(6) })], check(1, "completed", "failure", "aaaa"))).toEqual([]);
  });
  it("rules:github-events/what-was-past-when-it-was-heard-is-not-told-as-now", () => {
    // Bo approved at 2; their older "changes" comes late.
    expect(told([pr("opened"), review(2, "approved", T(2))], review(1, "changes_requested", T(1)))).toEqual([]);
    expect(told([pr("opened"), pr("closed", { state: "closed", merged: true, at: T(5) })], pr("synchronize", { head: "bbbb", at: T(2) }))).toEqual([]);
  });
  it("rules:github-events/as-an-event-of-the-work-that-follows-it", () => {
    const at = { account: "juno-test", place: "acme/tool" };
    const work = (before: readonly Delivery[], ...after: readonly Delivery[]) => told(before, ...after).map((one) => github.asWork(one, at));
    expect(work([pr("opened")], said(1, "Any news?", T(1)))).toMatchObject([{ is: "heard", from: { connector: "github", account: "juno-test", place: "acme/tool", id: "7" } }]);
    expect(work([pr("opened")], review(1, "approved", T(1)))).toMatchObject([{ is: "passed", by: "person", person: "bo" }]);
    expect(work([pr("opened")], review(1, "changes_requested", T(1), "bo", "aaaa", "Name it better"))).toMatchObject([{ is: "failed", by: "person", person: "bo", says: "Name it better" }]);
    expect(work([pr("opened")], check(1, "completed", "failure"))).toMatchObject([{ is: "failed", by: "ci", says: expect.stringContaining("test") }]);
    expect(work([pr("opened")], check(1, "completed", "success"))).toMatchObject([{ is: "passed", by: "ci" }]);
    expect(work([pr("opened")], pr("edited", { mergeable: false, at: T(1) }))).toMatchObject([{ is: "failed", by: "connector" }]);
    expect(work([pr("opened")], pr("closed", { state: "closed", merged: true, at: T(1) }))).toMatchObject([{ is: "finished outside", as: "done" }]);
    expect(work([pr("opened")], pr("closed", { state: "closed", at: T(1) }))).toMatchObject([{ is: "finished outside", as: "no" }]);
    const twice = work([pr("opened")], said(1, "a", T(1))).map((one) => one?.key);
    expect(twice).toEqual(work([pr("opened")], said(1, "a", T(1))).map((one) => one?.key));
  });
});

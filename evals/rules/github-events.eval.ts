import { describe, expect, it } from "vitest";
import { githubEvents as github } from "~/modules/github-events/service.ts";
import type { GithubRecord, Kept, Read } from "~/modules/github-events/types.ts";
import { deliveries, EXAMPLES, shuffled, TRACES, type Delivery, type Trace } from "./github-trace.ts";

/* On what really happened on 35 pull requests, and on every delivery GitHub publishes. */

const us = { login: "juno-test[bot]", mention: "@juno", label: "juno" };
const read = ({ event, payload }: Delivery): Read => github.read(event, payload, us);
const recordsOf = (got: Read): readonly GithubRecord[] => (got._tag === "Heard" || got._tag === "Noise" ? got.records : []);
const all = (trace: Trace): readonly (readonly GithubRecord[])[] => deliveries(trace).map((one) => recordsOf(read(one)));
const kept = (batches: readonly (readonly GithubRecord[])[]): Kept => batches.reduce((was, one) => github.keep(was, one), {} as Kept);
const ended = ({ ends }: Trace): string => (ends.merged ? "merged" : ends.state === "closed" ? "closed" : ends.draft ? "draft" : "open");

describe("what GitHub publishes", () => {
  const names = new Set(["issues", "issue_comment", "pull_request", "pull_request_review", "pull_request_review_comment", "pull_request_review_thread", "check_run", "status", "push", "installation", "installation_repositories"]);
  it("rules:github-events/reads-every-delivery-github-publishes", () => {
    for (const { name, examples } of EXAMPLES) {
      for (const payload of examples) {
        const got = github.read(name, payload, us);
        expect(got._tag, `${name}.${payload["action"] ?? ""}`).not.toBe("Broken");
        if (!names.has(name)) expect(got._tag, name).toBe("Noise");
      }
    }
  });
  it("rules:github-events/a-record-has-the-time-github-gave-it", () => {
    for (const { name, examples } of EXAMPLES.filter(({ name: one }) => names.has(one))) {
      for (const payload of examples) {
        for (const record of recordsOf(github.read(name, payload, us))) {
          expect(record.at, `${name}.${payload["action"] ?? ""} ${record.is}`).toBeGreaterThan(0);
          if (record.is === "item") expect(record.at).toBe(Date.parse((payload["pull_request"] ?? payload["issue"]).updated_at));
        }
      }
    }
  });
  it("rules:github-events/never-throws-whatever-comes", () => {
    const odd = [null, 7, "x", [], {}, { action: "opened" }, { action: "opened", issue: null, repository: { full_name: "a/b" } }, { repository: {}, pull_request: { number: "7" } }];
    for (const name of names) {
      for (const payload of odd) expect(["Broken", "Noise"]).toContain(github.read(name, payload, us)._tag);
    }
    for (const { name, examples } of EXAMPLES) {
      for (const payload of examples) {
        for (const key of Object.keys(payload)) expect(() => github.read(name, { ...payload, [key]: null }, us)).not.toThrow();
      }
    }
  });
  it("rules:github-events/uninstalled-and-suspended-say-what-is-lost", () => {
    const of = (action: string) => EXAMPLES.find(({ name }) => name === "installation")?.examples.filter((one) => one["action"] === action) ?? [];
    for (const payload of [...of("deleted"), ...of("suspend")]) expect(github.read("installation", payload, us)).toMatchObject({ _tag: "Account", works: false, installation: payload["installation"].id });
    for (const payload of [...of("created"), ...of("unsuspend")]) expect(github.read("installation", payload, us)).toMatchObject({ _tag: "Account", works: true });
    const removed = EXAMPLES.find(({ name }) => name === "installation_repositories")?.examples.find((one) => one["action"] === "removed");
    expect(github.read("installation_repositories", removed, us)).toMatchObject({ _tag: "Account", works: true, lost: removed?.["repositories_removed"].map((one: any) => one.full_name) });
  });
});

describe("real pull requests", () => {
  it("rules:github-events/ends-as-github-says-it-did", () => {
    for (const trace of TRACES) {
      const state = github.stateOf(kept(all(trace)), trace.number, us);
      expect({ is: state?.is, head: state?.head, labels: state?.labels }, `#${trace.number}`).toEqual({ is: ended(trace), head: trace.ends.head, labels: trace.ends.labels });
    }
  });
  it("rules:github-events/late-twice-and-in-any-order-is-the-same-end", () => {
    for (const trace of TRACES) {
      const batches = all(trace);
      const right = kept(batches);
      for (let seed = 1; seed <= 25; seed += 1) {
        const mixed = kept(shuffled([...batches, ...shuffled(batches, seed + 100).slice(0, 4)], seed));
        expect(mixed, `#${trace.number}, shuffle ${seed}`).toEqual(right);
        expect(github.stateOf(mixed, trace.number, us)).toEqual(github.stateOf(right, trace.number, us));
      }
    }
  });
  it("rules:github-events/what-was-lost-is-put-right-by-asking", () => {
    for (const trace of TRACES) {
      const batches = all(trace);
      const last = deliveries(trace).findLast(({ payload }) => payload["pull_request"] !== undefined);
      const half = kept(batches.slice(0, Math.ceil(batches.length / 2)));
      const asked = github.asked(trace.number, { pull: { ...last?.payload["pull_request"], state: trace.ends.state } }, Date.parse(trace.ends.at) + 60_000);
      const state = github.stateOf(github.keep(half, asked), trace.number, us);
      expect({ is: state?.is, head: state?.head }, `#${trace.number}`).toEqual({ is: ended(trace), head: trace.ends.head });
    }
  });
  it("rules:github-events/each-person's-last-word-and-not-one-taken-back", () => {
    for (const trace of TRACES) {
      const back = new Set(trace.events.filter(({ is }) => is === "review_dismissed").map(({ review }) => review));
      const last = new Map<string, string>();
      for (const one of trace.events) if (one.is === "reviewed" && one.state !== "commented") last.set(one.by ?? "", back.has(one.id) || one.state === "dismissed" ? "" : one.state === "approved" ? "approved" : "changes");
      const state = github.stateOf(kept(all(trace)), trace.number, us);
      const want = [...last].filter(([, says]) => says !== "").map(([who, says]) => ({ who, says })).toSorted((a, b) => (a.who < b.who ? -1 : 1));
      expect(state?.reviews.map(({ who, says }) => ({ who, says })), `#${trace.number}`).toEqual(want);
    }
  });
  it("rules:github-events/everything-is-told-once-in-the-end", () => {
    for (const trace of TRACES) {
      const batches = all(trace);
      const run = (order: readonly (readonly GithubRecord[])[]): readonly string[] => {
        let was: Kept = github.keep({}, batches[0] ?? []);
        const keys: string[] = [];
        for (const one of order) {
          const now = github.keep(was, one);
          keys.push(...github.told(was, now, trace.number, us).map(({ key }) => key));
          was = now;
        }
        return keys;
      };
      const keys = run([...batches, ...batches]);
      expect(new Set(keys).size, `#${trace.number}`).toBe(keys.length);
      expect(keys.filter((key) => key.startsWith("comment:")).length).toBe(trace.events.filter(({ is }) => is === "commented").length);
      // Comments are told whatever the order; that it ended is told once, whatever the order, if it ended.
      for (let seed = 1; seed <= 10; seed += 1) {
        const mixed = run(shuffled([...batches, ...batches.slice(0, 3)], seed));
        expect(new Set(mixed).size).toBe(mixed.length);
        expect(mixed.filter((key) => key.startsWith("comment:")).toSorted()).toEqual(keys.filter((key) => key.startsWith("comment:")).toSorted());
      }
      const end = run(batches).length === 0 ? [] : github.told(kept(batches.slice(0, 1)), kept(batches), trace.number, us).filter(({ is }) => is === "ended");
      expect(end.length, `#${trace.number}`).toBe(trace.ends.state === "closed" ? 1 : 0);
    }
  });
});

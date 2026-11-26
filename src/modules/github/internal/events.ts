import type { GitHubEvent } from "../types.ts";
import { type Json, listAt, numberAt, recordAt, textAt } from "./payload.ts";

/** What one event says, before it is a Trigger for a manager. */
export interface Said {
  readonly number: number;
  readonly title: string;
  readonly text: string;
  /** The issue or pull request it is on, then any it links to. */
  readonly numbers: readonly number[];
  /** `DT-14` when the branch or title names a Task. */
  readonly task?: string;
  readonly fork: boolean;
}

export type Read = { readonly _tag: "Said"; readonly said: Said } | { readonly _tag: "Skipped"; readonly reason: string };

const said = (value: Said): Read => ({ _tag: "Said", said: value });
const skipped = (reason: string): Read => ({ _tag: "Skipped", reason });

const ISSUE_ACTIONS = new Set(["opened", "reopened", "edited", "labeled"]);
const PR_ACTIONS = new Set(["opened", "reopened", "edited", "labeled", "ready_for_review"]);
const FAILED = new Set(["failure", "timed_out", "action_required"]);

/** `Fixes #12`, `closes acme/api#12`: the issues a pull request closes. */
const linked = (body: string): number[] =>
  [...body.matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+(?:[\w.-]+\/[\w.-]+)?#(\d+)/giu)].map((match) => Number(match[1]));

/** A branch `dt-14-docs` or a title with `DT-14` names that Task. */
const taskNamed = (...texts: readonly string[]): string | undefined => {
  for (const value of texts) {
    const number = /\bdt-(\d+)\b/iu.exec(value)?.[1];
    if (number !== undefined) return `DT-${number}`;
  }
  return undefined;
};

function issue(payload: Json, action: string): Read {
  const found = recordAt(payload, "issue");
  const number = numberAt(found, "number");
  if (found === undefined || number === undefined) return skipped("an issue event without its issue");
  if (!ISSUE_ACTIONS.has(action)) return skipped(`issue ${action} is not something to act on`);
  return said({ number, title: textAt(found, "title") ?? "", text: textAt(found, "body") ?? "", numbers: [number], fork: false });
}

function comment(payload: Json, action: string): Read {
  const on = recordAt(payload, "issue");
  const number = numberAt(on, "number");
  const body = textAt(recordAt(payload, "comment"), "body");
  if (number === undefined || body === undefined) return skipped("a comment event without its comment");
  if (action !== "created") return skipped(`comment ${action} is not something to act on`);
  return said({ number, title: textAt(on, "title") ?? "", text: body, numbers: [number], fork: false });
}

function pullRequest(payload: Json, action: string): Read {
  const pr = recordAt(payload, "pull_request");
  const number = numberAt(pr, "number");
  if (pr === undefined || number === undefined) return skipped("a pull request event without its pull request");
  if (!PR_ACTIONS.has(action)) return skipped(`pull request ${action} is not something to act on`);
  const head = recordAt(recordAt(pr, "head") ?? {}, "repo");
  const base = recordAt(recordAt(pr, "base") ?? {}, "repo");
  const fork = head === undefined || head["fork"] === true || textAt(head, "full_name") !== textAt(base, "full_name");
  const title = textAt(pr, "title") ?? "";
  const body = textAt(pr, "body") ?? "";
  const task = taskNamed(textAt(recordAt(pr, "head"), "ref") ?? "", title);
  return said({ number, title, text: body, numbers: [number, ...linked(body)], ...(task === undefined ? {} : { task }), fork });
}

function review(payload: Json, action: string): Read {
  const pr = recordAt(payload, "pull_request");
  const number = numberAt(pr, "number");
  const found = recordAt(payload, "review");
  if (number === undefined || found === undefined) return skipped("a review event without its review");
  if (action !== "submitted") return skipped(`review ${action} is not something to act on`);
  const state = textAt(found, "state") ?? "commented";
  const text = [`Review: ${state}`, textAt(found, "body") ?? ""].filter((part) => part !== "").join("\n\n");
  return said({ number, title: textAt(pr, "title") ?? "", text, numbers: [number], fork: false });
}

function checkRun(payload: Json, action: string): Read {
  const run = recordAt(payload, "check_run");
  if (run === undefined) return skipped("a check event without its check");
  const conclusion = textAt(run, "conclusion");
  if (action !== "completed" || conclusion === undefined || !FAILED.has(conclusion)) return skipped("a check that did not fail");
  const numbers = listAt(run, "pull_requests").flatMap((pr) => numberAt(pr, "number") ?? []);
  const [number] = numbers;
  if (number === undefined) return skipped("a failed check on no pull request");
  const output = recordAt(run, "output");
  const text = [textAt(output, "title"), textAt(output, "summary"), textAt(run, "html_url")].filter((part) => part !== undefined);
  return said({
    number,
    title: `Check failed: ${textAt(run, "name") ?? "a check"} (${conclusion})`,
    text: text.join("\n\n"),
    numbers,
    fork: false,
  });
}

export const READERS: Readonly<Record<GitHubEvent, (payload: Json, action: string) => Read>> = {
  issues: issue,
  issue_comment: comment,
  pull_request: pullRequest,
  pull_request_review: review,
  check_run: checkRun,
};

export const isEvent = (value: unknown): value is GitHubEvent => typeof value === "string" && Object.hasOwn(READERS, value);

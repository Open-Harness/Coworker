import type { WorkEvent } from "~/modules/work/types.ts";
import type { GithubRecord, ItemRecord, Who } from "./records.ts";

export type * from "./records.ts";

/*
 * What GitHub says, and what is true because of it.
 *
 * A delivery is not a step of a machine: deliveries come late, twice, out of order, or never. But each carries whole
 * records (the issue as it is, the review, the check), so nothing is worked out from verbs. `read` takes the records out,
 * `keep` keeps the newest of each, `stateOf` says what is true now, and `told` what became true. Asking GitHub gives the
 * same records (`asked`), so catching up is the same path. Pure; proved on real pull requests.
 */

/** What a connector hears of this: the ids in `connectors`. */
export type HeardEvent =
  | "issue"
  | "label"
  | "comment"
  | "pull_request"
  | "review"
  | "line_comment"
  | "check"
  | "push"
  | "merged"
  | "closed";

export type Read =
  | {
      readonly _tag: "Heard";
      readonly repo: string;
      readonly installation: number | null;
      readonly event: HeardEvent;
      readonly records: readonly GithubRecord[];
      /** The issues and pull requests it is about: its own, then those it says it closes. A check's, by its commit, are not here. */
      readonly numbers: readonly number[];
      readonly sha: string | null;
      readonly who: Who;
      /** It mentions us, or is our label, put on now. */
      readonly addressed: boolean;
      readonly title: string;
      readonly text: string;
      readonly at: number;
      /** The same thing heard twice has the same one, whatever the delivery's id. */
      readonly same: string;
    }
  | {
      readonly _tag: "Account";
      readonly installation: number;
      readonly works: boolean;
      readonly says: string;
      readonly lost: readonly string[];
      readonly got: readonly string[];
    }
  /** Records it carried are kept; nobody is told. Ours coming back, a pin, a milestone. */
  | { readonly _tag: "Noise"; readonly repo: string | null; readonly why: string; readonly records: readonly GithubRecord[] }
  | { readonly _tag: "Broken"; readonly why: string };

/** The newest of each record of a repo, by key. Stored as it is. */
export type Kept = Readonly<Record<string, GithubRecord>>;

export interface CheckState {
  readonly is: "none" | "running" | "passed" | "failed";
  readonly failed: readonly { readonly name: string; readonly says: string; readonly link: string | null; readonly id: number }[];
}

export interface ReviewState {
  readonly who: string;
  readonly says: "approved" | "changes";
  /** It was about the head as it is now. */
  readonly onHead: boolean;
}

export interface ItemState {
  readonly number: number;
  readonly pull: boolean;
  readonly is: "open" | "draft" | "merged" | "closed" | "gone";
  readonly closedAs: ItemRecord["closedAs"];
  readonly labels: readonly string[];
  readonly head: string | null;
  readonly merge: "unknown" | "clean" | "conflict";
  readonly checks: CheckState;
  /** Each person's latest that says yes or no; a comment changes nothing, a dismissal takes it away. Bots too, named. */
  readonly reviews: readonly ReviewState[];
  /** Talks on lines that are not settled. */
  readonly talks: number;
  /** What is the next thing anyone must do. */
  readonly waits: "us" | "checks" | "review" | "merge" | "nothing";
  /** `false`: two records of the same second disagree, or a part was never heard. Ask GitHub. */
  readonly sure: boolean;
}

/** Something that became true. Its key is of the thing, not of the delivery: told once, however often it is heard. */
export type Told = { readonly key: string; readonly number: number; readonly at: number } & (
  | {
      readonly is: "said";
      readonly where: "thread" | "line";
      readonly id: number;
      readonly who: Who;
      readonly text: string;
      readonly path?: string;
      readonly line?: number | null;
    }
  | {
      readonly is: "reviewed";
      readonly who: Who;
      readonly says: "approved" | "changes" | "commented";
      readonly text: string;
      readonly onHead: boolean;
    }
  | { readonly is: "taken back"; readonly who: string }
  | { readonly is: "checked"; readonly ended: "passed" | "failed"; readonly failed: CheckState["failed"]; readonly sha: string }
  | { readonly is: "moved"; readonly sha: string }
  | { readonly is: "conflict"; readonly sha: string }
  | { readonly is: "ended"; readonly as: "merged" | "closed"; readonly closedAs: ItemRecord["closedAs"]; readonly who: string | null }
  | { readonly is: "opened again" }
  | { readonly is: "ready" }
);

export interface Us {
  /** `juno-test[bot]`. */
  readonly login: string;
  /** `@juno`, and what its label is called. */
  readonly mention: string;
  readonly label: string;
}

export interface GithubEvents {
  /** One delivery. `event` is the header `X-GitHub-Event`. Never throws, whatever the payload is. */
  readonly read: (event: string, payload: unknown, us: Us) => Read;
  /** What GitHub's answers hold: one issue, one pull request, a list of comments, reviews, lines, check runs. `at`: when it was asked; such records win over older ones. */
  readonly asked: (
    number: number,
    answers: {
      readonly issue?: unknown;
      readonly pull?: unknown;
      readonly comments?: unknown;
      readonly reviews?: unknown;
      readonly lines?: unknown;
      readonly checks?: unknown;
    },
    at: number,
  ) => readonly GithubRecord[];
  /** Any order, any number of times: the same end. */
  readonly keep: (kept: Kept, records: readonly GithubRecord[]) => Kept;
  readonly stateOf: (kept: Kept, number: number, us: Us) => ItemState | undefined;
  /**
   * What became true for one item between two states of what is kept. Nothing when it was not known before: that is not
   * news. Nothing that we did ourselves, but for `ended`. A thing that was already past when it was heard is not told as if it were now.
   */
  readonly told: (before: Kept, after: Kept, number: number, us: Us) => readonly Told[];
  /** The items a commit belongs to: open pull requests with this head. */
  readonly withHead: (kept: Kept, sha: string) => readonly number[];
  /** The issues a pull request says it closes, in this repo. */
  readonly closes: (body: string, repo: string) => readonly number[];
  /** As an event of the work that follows this item. `undefined`: nothing for work. */
  readonly asWork: (told: Told, thread: { readonly account: string; readonly place: string }) => WorkEvent | undefined;
}

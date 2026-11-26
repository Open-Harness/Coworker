/* The records a delivery carries. */

export interface Who {
  readonly login: string;
  readonly id: number;
  readonly bot: boolean;
}

/** Newest wins: by `at`, and GitHub's times are whole seconds, so then by `rank`. Two that tie on both and differ: `tied`. */
interface Versioned {
  readonly at: number;
  readonly rank: number;
  readonly tied?: true;
}

/** An issue, or the part of a pull request that is also an issue. `updated_at`. */
export interface ItemRecord extends Versioned {
  readonly is: "item";
  readonly number: number;
  readonly pull: boolean;
  readonly open: boolean;
  /** Why it was closed, when GitHub says. */
  readonly closedAs: "completed" | "not planned" | "duplicate" | null;
  readonly title: string;
  readonly body: string;
  readonly labels: readonly string[];
  readonly assignees: readonly string[];
  readonly by: Who;
  readonly gone: boolean;
}

export interface PullRecord extends Versioned {
  readonly is: "pull";
  readonly number: number;
  readonly draft: boolean;
  readonly merged: boolean;
  readonly mergedBy: Who | null;
  readonly mergeSha: string | null;
  readonly head: { readonly ref: string; readonly sha: string; readonly repo: string | null };
  readonly base: { readonly ref: string; readonly sha: string };
  /** `null`: GitHub has not worked it out yet, which is most of the time in a delivery. */
  readonly mergeable: boolean | null;
  /** Who was asked to review and has not. */
  readonly asked: readonly string[];
}

export interface CommentRecord extends Versioned {
  readonly is: "comment";
  readonly id: number;
  readonly number: number;
  readonly by: Who;
  readonly body: string;
  readonly gone: boolean;
}

export interface LineRecord extends Versioned {
  readonly is: "line";
  readonly id: number;
  readonly number: number;
  readonly by: Who;
  readonly body: string;
  readonly path: string;
  /** `null`: the line is not in the diff any more. */
  readonly line: number | null;
  readonly answers: number | null;
  readonly review: number | null;
  readonly gone: boolean;
}

export interface ReviewRecord extends Versioned {
  readonly is: "review";
  readonly id: number;
  readonly number: number;
  readonly by: Who;
  readonly says: "approved" | "changes" | "commented" | "dismissed";
  readonly sha: string | null;
  readonly body: string;
}

/** Lines that belong together; named by their first comment. GitHub gives it no time: it is the delivery's item's. */
export interface TalkRecord extends Versioned {
  readonly is: "talk";
  readonly number: number;
  readonly first: number;
  readonly settled: boolean;
}

/** A check run, or a commit status (`app` is "status"). Run again it has a new id, and a newer id wins. */
export interface CheckRecord extends Versioned {
  readonly is: "check";
  readonly id: number;
  readonly sha: string;
  readonly app: string;
  readonly name: string;
  readonly state: "waits" | "running" | "done";
  /** What GitHub calls neutral or skipped passes. Cancelled or stale is neither. */
  readonly ended: "passed" | "failed" | "neither" | null;
  readonly says: string;
  readonly link: string | null;
}

export interface BranchRecord extends Versioned {
  readonly is: "branch";
  readonly ref: string;
  readonly sha: string | null;
  readonly forced: boolean;
  readonly main: boolean;
  readonly by: Who;
}

export type GithubRecord = ItemRecord | PullRecord | CommentRecord | LineRecord | ReviewRecord | TalkRecord | CheckRecord | BranchRecord;

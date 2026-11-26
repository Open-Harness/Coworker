import type { Json } from "./http.ts";

/* What the fake GitHub knows. One of these for a whole run: every flow has its own repos, so none sees another's. */

export interface Person {
  readonly id: number;
  readonly login: string;
  readonly type: "User" | "Bot";
}

export interface Comment {
  readonly id: number;
  readonly by: Person;
  body: string;
  readonly at: string;
  updated: string;
  /** A comment on a line of a pull request. */
  readonly path?: string;
  readonly line?: number;
  readonly answers?: number;
}

export interface Review {
  readonly id: number;
  readonly by: Person;
  readonly state: "APPROVED" | "CHANGES_REQUESTED" | "COMMENTED";
  readonly body: string;
  /** The head it was about, and when. */
  readonly sha: string | null;
  readonly at: string;
}

export interface Issue {
  readonly number: number;
  readonly by: Person;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  readonly comments: Comment[];
  readonly created: string;
  /** GitHub's `updated_at`: it moves with every change of the issue or its pull request. */
  updated: string;
  /** A pull request, when there is one. */
  pull?: Pull;
}

export interface Pull {
  readonly branch: string;
  readonly base: string;
  merged: boolean;
  mergedBy: Person | null;
  mergeSha: string | null;
  draft: boolean;
  readonly reviews: Review[];
  readonly lines: Comment[];
  /** Threads of line comments (named by the first comment's id) that were settled. */
  readonly settled: Set<number>;
}

export interface Check {
  readonly id: number;
  readonly sha: string;
  readonly name: string;
  readonly conclusion: "success" | "failure" | null;
  readonly log: string;
}

export interface Repo {
  readonly name: string;
  readonly folder: string;
  readonly installation: number;
  /** What each login may do: `write` and `admin` may ask. */
  readonly people: Map<string, "admin" | "write" | "read">;
  readonly issues: Map<number, Issue>;
  readonly checks: Check[];
  /** Nobody may push to the default branch, and checks must pass before a merge. */
  guarded: boolean;
  /** Webhooks GitHub has made and not yet been asked for. */
  readonly deliveries: Delivery[];
  /** What GitHub would have sent while the App was suspended. It does not send it later; `redeliver` is the owner's button. */
  readonly missed: Delivery[];
}

export interface Delivery {
  readonly id: string;
  readonly event: string;
  readonly payload: Json;
}

export interface Token {
  readonly token: string;
  readonly installation: number;
  readonly repos: readonly string[];
  readonly permissions: Readonly<Record<string, string>>;
}

/** One call the product made, as GitHub saw it. Never the token itself. */
export interface Call {
  readonly method: string;
  readonly path: string;
  readonly repo: string | null;
  readonly status: number;
  readonly permissions: Readonly<Record<string, string>> | null;
  readonly body: Json;
}

export const repos = new Map<string, Repo>();
export const tokens = new Map<string, Token>();
export const calls: Call[] = [];
export const codes = new Map<string, { readonly login: string; readonly installations: readonly number[] }>();
/** What an installation allows, and whether it is suspended. */
export const installations = new Map<number, { account: string; permissions: Record<string, string>; on: boolean }>();

export const BOT: Person = { id: 41, login: "juno-test[bot]", type: "Bot" };
export const ALLOWED: Record<string, string> = {
  metadata: "read",
  contents: "write",
  issues: "write",
  pull_requests: "write",
  checks: "write",
  actions: "read",
};

export const repoOf = (name: string): Repo | undefined => repos.get(name.toLowerCase());

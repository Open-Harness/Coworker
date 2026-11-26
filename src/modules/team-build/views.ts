/*
 * What the Sources screens show: the repos a manager hears, and its email addresses.
 */

/** Where a manager listens. */
export type GitHubEvent = "issues" | "issue_comment" | "pull_request" | "pull_request_review" | "check_run";
export interface RepoSourceData {
  readonly repo: string;
  readonly events: readonly GitHubEvent[];
}
export interface GitHubSources {
  /** The account the App is installed on; absent when it is not. */
  readonly account?: string;
  readonly repos: readonly string[];
  readonly listening: readonly RepoSourceData[];
  /** The App was uninstalled and not installed again: from which account, when, and what this manager heard through it. */
  readonly lost?: { readonly account: string; readonly at: number; readonly heard: readonly RepoSourceData[] };
}
export interface EmailAddress {
  readonly managerId: string;
  readonly name: string;
  readonly address: string;
  readonly taskAddress: string;
  readonly how: string;
  readonly status: string;
}
export interface EmailData {
  /** What every address ends in: `.acme@co-worker.tech`. */
  readonly ending: string;
  readonly addresses: readonly EmailAddress[];
}

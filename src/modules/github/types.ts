/*
 * GitHub as a Source (model.md "Sources as plugins"): one GitHub App, one installation per workspace. Each manager
 * picks repos and, per repo, the events it hears. Webhooks become Triggers; replies go out as comments; a sandbox gets
 * a short-lived token for one repo, never the App's key.
 */
import type { Channel, ReplyAddress, Routed, SendOutcome, Trigger } from "~/modules/triggers/types.ts";

/** The webhook events a manager can choose per repo. Labels arrive inside `issues` and `pull_request`. */
export type GitHubEvent = "issues" | "issue_comment" | "pull_request" | "pull_request_review" | "check_run";

/** The App installed on one account, and the repos it may reach there: `acme/api`. */
export interface Installation {
  readonly id: number;
  readonly account: string;
  readonly repos: readonly string[];
}

export type Claim =
  | { readonly _tag: "Claimed"; readonly installation: Installation }
  /** GitHub did not take the code: used, expired, or not its own. */
  | { readonly _tag: "NotSignedIn" }
  /** No such installation, or someone who may not give it away. The two look the same, so ids can't be probed. */
  | { readonly _tag: "NotYours" };

export type Permission = "read" | "write";
export type Permissions = Readonly<Record<string, Permission>>;

/** An installation token: one repo, a few permissions, an hour at most. */
export interface RepoToken {
  readonly token: string;
  readonly repo: string;
  readonly permissions: Permissions;
  readonly expiresAt: number;
}

export type TokenResult = { readonly _tag: "Token"; readonly token: RepoToken } | { readonly _tag: "Failed"; readonly reason: string };

/** GitHub's API as the App calls it. The App's private key stays behind this interface. */
export interface GitHubApi {
  /** GitHub's page for installing the App. It sends the person back with the installation's id and `state`. */
  readonly installUrl: (state: string) => string | undefined;
  readonly installation: (id: number) => Promise<Installation | undefined>;
  /** The installation, if the person GitHub signed in for `code` administers every repo it reaches. */
  readonly claim: (id: number, code: string) => Promise<Claim>;
  readonly token: (installation: number, repo: string, permissions: Permissions) => Promise<TokenResult>;
  readonly comment: (installation: number, repo: string, number: number, body: string) => Promise<SendOutcome>;
}

/** What one manager hears from one repo. */
export interface RepoSource {
  readonly managerId: string;
  readonly repo: string;
  readonly events: readonly GitHubEvent[];
}

/** The workspace's GitHub connection, as its settings show it. */
export interface GitHubConnection {
  readonly installation?: Installation;
  readonly sources: readonly RepoSource[];
}

/** The App was uninstalled and not installed again: what it was on and what each manager heard through it. */
export interface LostConnection {
  readonly account: string;
  readonly at: number;
  readonly sources: readonly RepoSource[];
}

/** One webhook request, as GitHub sent it. */
export interface Delivery {
  readonly id: string;
  readonly event: string;
  readonly signature: string | undefined;
  readonly body: string;
}

/** The workspace a delivery is for, as the Source needs it. The Workspace object's stub is one. */
export interface Hub {
  readonly gitHub: () => Promise<GitHubConnection>;
  readonly managers: () => Promise<readonly { readonly managerId: string; readonly slug: string }[]>;
  readonly receive: (trigger: Trigger) => Promise<Routed>;
  readonly logEvent: (managerId: string, line: string) => Promise<void>;
}

/** Which workspace claimed an installation; and what happens when the App is uninstalled. */
export interface Installations {
  readonly hubOf: (installation: number) => Promise<Hub | undefined>;
  /** Stops the workspace's GitHub sources and tells its Owners. */
  readonly removed: (installation: number) => Promise<void>;
}

export type Received =
  /** No signature, or the wrong one. Nothing was read. */
  | { readonly _tag: "Unsigned" }
  | { readonly _tag: "Heard"; readonly routed: readonly Routed[] }
  | { readonly _tag: "Uninstalled" }
  | { readonly _tag: "Skipped"; readonly reason: string };

export interface GitHubDependencies {
  /** The App's webhook secret. */
  readonly secret: string;
  /** The App's slug: its comments come from `<slug>[bot]`, and `@<slug>` mentions every manager on the repo. */
  readonly appSlug: string;
  readonly installations: Installations;
  readonly now: () => number;
}

export interface GitHubSource {
  readonly receive: (delivery: Delivery) => Promise<Received>;
  /** The same, from GitHub's own request, answered as GitHub expects. */
  readonly webhook: (request: Request) => Promise<Response>;
}

export interface GitHub {
  readonly source: (dependencies: GitHubDependencies) => GitHubSource;
  /** Replies as comments on the issue or pull request a Task came from. */
  readonly channel: (api: GitHubApi) => Channel;
  /** The token a sandbox gets for a Task's repo. A pull request from a fork only ever gets read access. */
  readonly repoToken: (api: GitHubApi, from: Extract<ReplyAddress, { kind: "github" }>) => Promise<TokenResult>;
  /** The events a template turns on for a repo it is given. */
  readonly startingEvents: (template: string) => readonly GitHubEvent[];
  /** Narrows sent events; anything unknown is left out. */
  readonly eventsOf: (value: unknown) => readonly GitHubEvent[];
}

import type { Channel, ReplyAddress } from "~/modules/triggers/types.ts";
import type { GitHubApi, Permissions, TokenResult } from "../types.ts";

/** A reply is a comment on the issue or pull request the Task came from. */
export const gitHubChannel = (api: GitHubApi): Channel => ({
  send: async ({ to, text }) =>
    to.kind === "github" ? api.comment(to.installation, to.repo, to.number, text) : { _tag: "Gone", reason: "Not a GitHub thread" },
});

/** What a sandbox may do in the Task's repo. Code from a fork is never trusted with writes. */
const BASE: Permissions = { contents: "write", pull_requests: "write", issues: "write", checks: "read", metadata: "read" };
const FORK: Permissions = { contents: "read", pull_requests: "read", issues: "read", checks: "read", metadata: "read" };

export const repoToken = (api: GitHubApi, from: Extract<ReplyAddress, { kind: "github" }>): Promise<TokenResult> =>
  api.token(from.installation, from.repo, from.fork ? FORK : BASE);

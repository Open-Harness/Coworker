import type { GitHub, GitHubEvent } from "./types.ts";
import { gitHubChannel, repoToken } from "./internal/channel.ts";
import { isEvent } from "./internal/events.ts";
import { receive } from "./internal/receive.ts";
import { webhook } from "./internal/webhook.ts";

export { appApi, type AppCredentials, noApp } from "./internal/api.ts";

/** What a template hears on a repo it is given, until someone changes it. */
const STARTING: Readonly<Record<string, readonly GitHubEvent[]>> = {
  kanban: ["issues", "issue_comment", "pull_request", "pull_request_review", "check_run"],
  incident: ["issues", "issue_comment", "check_run"],
  support: ["issues", "issue_comment"],
  research: ["issues", "issue_comment"],
};

export const github: GitHub = {
  source: (dependencies) => ({
    receive: (delivery) => receive(dependencies, delivery),
    webhook: (request) => webhook(dependencies, request),
  }),
  channel: gitHubChannel,
  repoToken,
  startingEvents: (template) => STARTING[template] ?? ["issues", "issue_comment"],
  eventsOf: (value) => (Array.isArray(value) ? [...new Set(value.filter(isEvent))] : []),
};

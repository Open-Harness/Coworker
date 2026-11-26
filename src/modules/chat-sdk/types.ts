/*
 * Spike `spike:chat-sdk/slack-in-do`: Vercel's Chat SDK (`chat` + `@chat-adapter/slack`) run inside a Durable Object.
 * This module is not wired into `src/main.ts`; only its test uses it. The Source that would wrap it (mapping a Slack
 * event onto a Trigger, with the Gate and the outbox) is what the spike decides whether to build.
 */
import type { Clock } from "~/modules/clock/types.ts";

/** What the object hands the SDK. Nothing here is read from the environment. */
export interface SlackChatConfig {
  /** The object's own SQLite: the SDK's subscriptions, locks and dedupe keys live in it. */
  readonly sql: SqlStorage;
  readonly clock: Clock;
  readonly signingSecret: string;
  readonly botToken: string;
  readonly botUserId: string;
  /** Slack's Web API base, `https://slack.com/api/` in production. */
  readonly apiUrl: string;
  /** `memory` is the SDK's own zero-dependency adapter: lost when the object is evicted. */
  readonly state: "sql" | "memory";
  /** The text to answer a mention with. */
  readonly answer: (mention: Mention) => string;
}

/** One message that mentioned the bot, as the SDK parsed it. */
export interface Mention {
  /** The Slack user id of the sender. */
  readonly user: string;
  readonly text: string;
  /** The SDK's thread id: `slack:<channel>:<thread ts>`. */
  readonly thread: string;
}

/** One webhook request, answered at once, plus the work the SDK carried on with afterwards. */
export interface Received {
  readonly response: Response;
  /** Settles when every background task of this request has: the object keeps it alive with `waitUntil`. */
  readonly done: Promise<void>;
}

export interface SlackChat {
  readonly receive: (request: Request) => Promise<Received>;
}

/** Opens the SDK over one object's storage. Opening twice over the same `sql` is what an eviction looks like. */
export type OpenSlackChat = (config: SlackChatConfig) => SlackChat;

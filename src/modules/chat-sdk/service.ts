import { createSlackAdapter } from "@chat-adapter/slack";
import { createMemoryState } from "@chat-adapter/state-memory";
import { Chat } from "chat";
import { sqlState } from "./internal/sql-state.ts";
import type { OpenSlackChat, Received, SlackChatConfig } from "./types.ts";

const silent = { child: () => silent, debug: () => undefined, info: () => undefined, warn: () => undefined, error: () => undefined };

const slackAdapter = (config: SlackChatConfig) =>
  createSlackAdapter({
    signingSecret: config.signingSecret,
    botToken: config.botToken,
    botUserId: config.botUserId,
    apiUrl: config.apiUrl,
    logger: silent,
  });

/** The SDK with one Slack adapter, its state in the object's SQLite, handlers registered, ready for requests. */
export const openSlackChat: OpenSlackChat = (config) => {
  const chat = new Chat({
    userName: "launch",
    adapters: { slack: slackAdapter(config) },
    state: config.state === "sql" ? sqlState(config.sql, config.clock) : createMemoryState(),
    logger: "silent",
  });
  chat.onNewMention(async (thread, message) => {
    await thread.post(config.answer({ user: message.author.userId, text: message.text, thread: thread.id }));
  });
  return {
    receive: async (request): Promise<Received> => {
      const tasks: Promise<unknown>[] = [];
      const response = await chat.webhooks.slack(request, { waitUntil: (task) => void tasks.push(task) });
      return { response, done: Promise.allSettled(tasks).then(() => undefined) };
    },
  };
};

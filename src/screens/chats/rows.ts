import type { Chat } from "~/modules/coworker/types.ts";

/** One chat in the table, with the chats forked from it under it. */
export interface Row extends Record<string, unknown> {
  id: string;
  chat: Chat;
  children?: Row[];
}

const rowOf = (chat: Chat, all: readonly Chat[]): Row => {
  const forks = all.filter((one) => one.under === chat.id);
  return { id: chat.id, chat, ...(forks.length > 0 ? { children: forks.map((fork) => rowOf(fork, all)) } : {}) };
};

/** The view lists each chat and then what was forked from it; a fork hangs under what it was forked from. */
export const rowsOf = (chats: readonly Chat[]): Row[] =>
  chats.filter((chat) => chat.under === null || !chats.some((one) => one.id === chat.under)).map((chat) => rowOf(chat, chats));

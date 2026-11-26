import { talks } from "~/modules/talks/service.ts";
import type { ChatRow } from "~/modules/talks/types.ts";
import type { ChatView } from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps } from "../types.ts";

/* A chat as it is kept by the workspace. A person's chats are their own: another person's is not found. */

export const threadOf = (chat: string): string => `chat:${chat}`;

/** The chat of this person, or nothing: what is another's is not theirs to find. */
export async function ownChat(c: ConsoleDeps, id: string): Promise<ChatRow | undefined> {
  return (await c.store.chats(c.who.id)).find((one) => one.id === id);
}

/** The chat is kept as it is now, and every page that has it open is told. */
export async function saveChat(c: ConsoleDeps, row: ChatRow): Promise<void> {
  await c.store.addChat(row);
  await c.store.changed(["/chats", `/chats/${row.id}`, "/shell"]);
}

export async function viewOf(c: ConsoleDeps, row: ChatRow, name: string): Promise<ChatView> {
  return talks.view(row, await c.store.chats(c.who.id), name);
}

export const chatOf = talks.chat;

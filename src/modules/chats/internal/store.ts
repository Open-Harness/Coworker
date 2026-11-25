import { type ConversationId, defineDoc, defineDocFamily, type EntryId } from "@earendil-works/pi-durable";

export type Meta = {
  title: string;
  /** False while the title is still the placeholder, so the first prompt may name the chat. */
  named: boolean;
  pinned: boolean;
  archivedAt?: number;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  parentId?: ConversationId;
  agent?: { id: string; name: string; version: number };
};

export const ChatIndex = defineDoc<{ chats: Record<string, Meta> }>({
  kind: "app.chats",
  version: 1,
  scope: "session",
  initial: () => ({ chats: {} }),
  checkpointWhen: () => true,
});

type Receipt =
  | { command: "create"; chatId: ConversationId }
  | { command: "fork"; chatId: ConversationId; from: ConversationId; entryId: EntryId };

/** What a request created, so a request replayed after a reconnect gets the same chat. Written once per request. */
export const CreationReceipts = defineDocFamily<{ receipt?: Receipt }, null>({
  family: true,
  kind: "app.chat-receipt",
  version: 1,
  scope: "session",
  initial: () => ({}),
  checkpointWhen: () => false,
});

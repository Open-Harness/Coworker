import type { ConversationId, Tx } from "@earendil-works/pi-durable";
import { ChatIndex, CreationReceipts, type Meta } from "./internal/store.ts";
import { titleFrom, UNTITLED } from "./internal/title.ts";
import type { ChatResult, Chats, StoredChat } from "./types.ts";

export { ChatIndex } from "./internal/store.ts";

const found = (chatId: ConversationId): ChatResult<ConversationId> => ({ ok: true, value: chatId });
const missing = (chatId: number): ChatResult<never> => ({
  ok: false,
  reason: "not_found",
  message: `Chat ${chatId} does not exist`,
});
const reused = (requestId: string): ChatResult<never> => ({
  ok: false,
  reason: "request_reused",
  message: `Request ${requestId} was already used for something else`,
});

async function liveMeta(tx: Tx, chatId: number): Promise<Meta | undefined> {
  const { chats } = await tx.doc(ChatIndex);
  const meta = chats[chatId];
  return meta === undefined || meta.deletedAt !== undefined ? undefined : meta;
}

const row = (id: number, meta: Readonly<Meta>): StoredChat => ({
  id,
  title: meta.title,
  pinned: meta.pinned,
  ...(meta.archivedAt === undefined ? {} : { archivedAt: meta.archivedAt }),
  createdAt: meta.createdAt,
  updatedAt: meta.updatedAt,
  createdBy: meta.createdBy,
  ...(meta.parentId === undefined ? {} : { parentId: meta.parentId }),
  ...(meta.agent === undefined ? {} : { agent: { ...meta.agent } }),
});

const list: Chats["list"] = async (tx) => {
  const { chats } = await tx.doc(ChatIndex);
  return Object.entries(chats)
    .filter(([, meta]) => meta.deletedAt === undefined)
    .map(([id, meta]) => row(Number(id), meta));
};

const find: Chats["find"] = async (tx, chatId) =>
  (await liveMeta(tx, chatId)) === undefined ? missing(chatId) : found(chatId as ConversationId);

const create: Chats["create"] = async (tx, { requestId, by, now, agent }, prepare) => {
  const doc = await tx.doc(CreationReceipts, requestId, null);
  if (doc.receipt !== undefined) {
    return doc.receipt.command === "create" ? found(doc.receipt.chatId) : reused(requestId);
  }
  const { id } = await tx.createConversation({ ownership: { kind: "ownerless" } });
  doc.receipt = { command: "create", chatId: id };
  const { chats } = await tx.doc(ChatIndex);
  chats[id] = { title: UNTITLED, named: false, pinned: false, createdAt: now, updatedAt: now, createdBy: by.name };
  if (agent !== undefined) chats[id].agent = { ...agent };
  await prepare?.(id);
  return found(id);
};

const fork: Chats["fork"] = async (tx, { requestId, by, now, chatId, entryId }) => {
  const doc = await tx.doc(CreationReceipts, requestId, null);
  const { receipt } = doc;
  if (receipt !== undefined) {
    const same = receipt.command === "fork" && receipt.from === chatId && receipt.entryId === entryId;
    return same ? found(receipt.chatId) : reused(requestId);
  }
  const source = await liveMeta(tx, chatId);
  if (source === undefined) return missing(chatId);
  const from = chatId as ConversationId;
  const { id } = await tx.forkConversation(from, entryId, { ownership: { kind: "ownerless" } });
  doc.receipt = { command: "fork", chatId: id, from, entryId };
  const { chats } = await tx.doc(ChatIndex);
  chats[id] = {
    title: `${source.title} (fork)`.slice(0, 120),
    named: true,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    createdBy: by.name,
    parentId: from,
    ...(source.agent === undefined ? {} : { agent: { ...source.agent } }),
  };
  return found(id);
};

const update: Chats["update"] = async (tx, chatId, { title, pinned, archived }, now) => {
  const meta = await liveMeta(tx, chatId);
  if (meta === undefined) return missing(chatId);
  if (title !== undefined) {
    meta.title = title.trim();
    meta.named = true;
  }
  if (pinned !== undefined) meta.pinned = pinned;
  if (archived === true) meta.archivedAt = now;
  if (archived === false) delete meta.archivedAt;
  return found(chatId as ConversationId);
};

const remove: Chats["remove"] = async (tx, chatId, now) => {
  const meta = await liveMeta(tx, chatId);
  if (meta === undefined) return missing(chatId);
  meta.deletedAt = now;
  return found(chatId as ConversationId);
};

const notePrompt: Chats["notePrompt"] = async (tx, chatId, text, now) => {
  const meta = await liveMeta(tx, chatId);
  if (meta === undefined) return;
  meta.updatedAt = now;
  if (meta.named) return;
  meta.title = titleFrom(text);
  meta.named = true;
};

export const chats: Chats = { list, find, create, fork, update, remove, notePrompt };

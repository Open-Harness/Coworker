import type { Context } from "@earendil-works/chord/context";
import { AssistantEntry, type ConversationId, type Cursor, type EntryRecord } from "@earendil-works/pi-durable";
import { chats } from "~/modules/chats/service.ts";
import type { SearchMatch } from "~/modules/protocol/types.ts";
import { isInput, messageText } from "~/modules/transcript/service.ts";
import type { SearchHistory } from "../types.ts";

const PAGE_SIZE = 50;
const MAX_MATCHES = 20;
const SNIPPET_RADIUS = 80;
export const SEARCH_HISTORY = "search_history";

type Reader = Parameters<SearchHistory>[0];

function snippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + length + SNIPPET_RADIUS);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

const searchedHistory = (entry: EntryRecord): boolean =>
  AssistantEntry.is(entry) &&
  (entry.model?.some(
    (message) => message.role === "assistant" && message.content.some((part) => part.type === "toolCall" && part.name === SEARCH_HISTORY),
  ) ??
    false);

function match(entry: EntryRecord, needle: string): SearchMatch | undefined {
  const role = isInput(entry) ? "user" : AssistantEntry.is(entry) ? "assistant" : undefined;
  if (role === undefined) return undefined;
  const text = messageText(entry.model?.[0]);
  const index = text.toLowerCase().indexOf(needle);
  if (index === -1) return undefined;
  return { chatId: entry.conversationId, entryId: entry.id, role, snippet: snippet(text, index, needle.length) };
}

/** One chat's own entries, newest first. A fork's inherited history belongs to the chat that wrote it. */
async function* ownEntries(reader: Reader, chatId: ConversationId, context: Context): AsyncGenerator<EntryRecord> {
  let cursor: Cursor | undefined;
  do {
    const page = await reader.commit((tx) => tx.scanEntries({ conversationId: chatId }, PAGE_SIZE, cursor), context);
    for (const entry of page.items) if (entry.conversationId === chatId) yield entry;
    cursor = page.next;
  } while (cursor !== undefined);
}

/** Turns that searched history are skipped, so a search never finds earlier searches. */
async function* turns(entries: AsyncGenerator<EntryRecord>): AsyncGenerator<readonly EntryRecord[]> {
  let turn: EntryRecord[] = [];
  for await (const entry of entries) {
    turn.push(entry);
    if (!isInput(entry)) continue;
    if (!turn.some(searchedHistory)) yield turn;
    turn = [];
  }
  if (!turn.some(searchedHistory)) yield turn;
}

export const searchHistory: SearchHistory = async (reader, term, context) => {
  const needle = term.trim().toLowerCase();
  if (needle.length === 0) return { matches: [], truncated: false };
  const matches: SearchMatch[] = [];
  const listed = await reader.commit((tx) => chats.list(tx), context);
  // Each page is its own commit, so a long scan never holds the workspace's commit line.
  for (const chat of [...listed].sort((left, right) => right.updatedAt - left.updatedAt)) {
    for await (const turn of turns(ownEntries(reader, chat.id as ConversationId, context))) {
      for (const entry of turn) {
        const found = match(entry, needle);
        if (found === undefined) continue;
        if (matches.length === MAX_MATCHES) return { matches, truncated: true };
        matches.push(found);
      }
    }
  }
  return { matches, truncated: false };
};

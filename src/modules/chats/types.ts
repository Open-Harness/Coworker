import type { ConversationId, EntryId, Tx } from "@earendil-works/pi-durable";
import type { AgentStamp } from "~/modules/agent-config/types.ts";
import type { ChatRow, RowChange } from "~/modules/protocol/types.ts";
import type { Author } from "~/modules/transcript/types.ts";

/** A chat without its live status, which the host knows and the store does not. */
export type StoredChat = Omit<ChatRow, "status">;

export type ChatResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: "not_found" | "request_reused"; readonly message: string };

interface NewChat {
  readonly requestId: string;
  readonly by: Author;
  readonly now: number;
}

/** The chats of a workspace: each is a top-level engine conversation plus its title, pin, archive and deletion. */
export interface Chats {
  list(tx: Tx): Promise<readonly StoredChat[]>;
  find(tx: Tx, chatId: number): Promise<ChatResult<ConversationId>>;
  /** `prepare` runs once, when the chat is made, not when its request is repeated. */
  create(
    tx: Tx,
    chat: NewChat & { readonly agent?: AgentStamp },
    prepare?: (chatId: ConversationId) => Promise<void>,
  ): Promise<ChatResult<ConversationId>>;
  fork(tx: Tx, chat: NewChat & { readonly chatId: number; readonly entryId: EntryId }): Promise<ChatResult<ConversationId>>;
  update(tx: Tx, chatId: number, change: RowChange, now: number): Promise<ChatResult<ConversationId>>;
  /** Hides the chat for good. The engine cannot delete a conversation, so its entries stay until the workspace goes. */
  remove(tx: Tx, chatId: number, now: number): Promise<ChatResult<ConversationId>>;
  /** Records a prompt: moves the chat up, and titles a chat that has no title yet. */
  notePrompt(tx: Tx, chatId: number, text: string, now: number): Promise<void>;
}

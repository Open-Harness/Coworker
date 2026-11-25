import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { type ConversationId, type Harness, LiveDoc } from "@earendil-works/pi-durable";
import type { ChatLine } from "../types.ts";
import { chatLines } from "./views.ts";

const WINDOW = 200;

/** The id of the line a conversation's answer-in-progress is shown as. The page replaces it by the entry once there is one. */
const STREAMING_ID = "streaming";

/**
 * What the model has written so far of the answer it is making now, as a last line of the conversation. The engine
 * keeps it in the conversation's live document, a little behind the model and before there is an entry for it, so
 * asking again shows it grown. Nothing when no answer is being written, or it has no words yet.
 */
async function streamingLine(harness: Harness, conversation: ConversationId): Promise<readonly ChatLine[]> {
  const live = await harness.snapshot(LiveDoc, conversation, BACKGROUND_CONTEXT);
  const content: unknown = live?.generation?.message?.content;
  if (!Array.isArray(content)) return [];
  const text = content
    .map((part: unknown) =>
      typeof part === "object" && part !== null && "type" in part && part.type === "text" && "text" in part && typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("");
  return text.trim() === "" ? [] : [{ id: STREAMING_ID, role: "manager", text, streaming: true }];
}

/** What a conversation shows: its last entries, then the answer being written. `managerId` is whose conversation it is, when a manager's. */
export async function linesOf(harness: Harness, id: ConversationId, managerId?: string): Promise<readonly ChatLine[]> {
  const conversation = await harness.conversation(id, BACKGROUND_CONTEXT);
  if (conversation === undefined) return [];
  const page = await conversation.entries({ order: "ascending" }, WINDOW, undefined, BACKGROUND_CONTEXT);
  return [...chatLines(page.items, managerId), ...(await streamingLine(harness, id))];
}

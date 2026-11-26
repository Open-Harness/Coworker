import { applyImmutable } from "@earendil-works/chord/delta";
import { ConversationTranscript, type ConversationView } from "@earendil-works/pi-durable";
import { buildChatView } from "~/modules/transcript/service.ts";
import type { ChatView } from "~/modules/transcript/types.ts";
import type { WorkspaceClient } from "./client.ts";

/** The chat as a page would draw it now, rebuilt from everything the client received. */
export function chatView(client: WorkspaceClient, chatId: number): ChatView | undefined {
  let view: ConversationView | undefined;
  const transcript = new ConversationTranscript(async () => ({ items: [] }));
  let merged: ReturnType<ConversationTranscript["merge"]> | undefined;
  for (const event of client.events) {
    if (event.type === "chat.view" && event.chatId === chatId) view = event.view;
    else if (event.type === "chat.ops" && event.chatId === chatId && view !== undefined) {
      view = applyImmutable(view, event.ops);
    } else continue;
    merged = transcript.merge(view);
  }
  return merged === undefined ? undefined : buildChatView(merged);
}

export const untilView = <T>(
  client: WorkspaceClient,
  chatId: number,
  what: string,
  select: (view: ChatView) => T | undefined,
): Promise<T> =>
  client.settle(
    what,
    () => {
      const view = chatView(client, chatId);
      return view === undefined ? undefined : select(view);
    },
    20_000,
  );

export const lastAnswer = (view: ChatView): string | undefined => {
  const block = view.blocks.findLast(({ kind }) => kind === "answer");
  return block?.kind === "answer" && !view.running ? block.text : undefined;
};

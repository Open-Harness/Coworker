import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { ConversationId, ConversationView, EntryId, Harness, WatchHandle } from "@earendil-works/pi-durable";
import type { Connections } from "./connections.ts";

const WINDOW = { min: 30, max: 60 } as const;

/** The chat each socket has open. A view starts with a window of the transcript and continues as operations. */
export class Watches {
  readonly #views = new Map<WebSocket, WatchHandle<ConversationView>>();

  constructor(readonly connections: Connections) {}

  /** `after` continues a transcript the client already holds. Returns false when the conversation is gone. */
  async open(harness: Harness, socket: WebSocket, chatId: number, after?: number): Promise<boolean> {
    await this.stop(socket);
    const conversation = await harness.conversation(chatId as ConversationId, BACKGROUND_CONTEXT);
    if (conversation === undefined) return false;
    const view = await conversation.watch(BACKGROUND_CONTEXT, {
      ...WINDOW,
      ...(after === undefined ? {} : { from: (after + 1) as EntryId }),
    });
    this.#views.set(socket, view);
    this.connections.send(socket, { type: "chat.view", chatId, view: view.value });
    view.start(async (call) => {
      if (this.#views.get(socket) !== view || call.kind !== "value") return;
      this.connections.send(socket, { type: "chat.ops", chatId, ops: call.ops });
    });
    void view.closed.finally(() => {
      if (this.#views.get(socket) === view) this.#views.delete(socket);
    });
    return true;
  }

  async stop(socket: WebSocket): Promise<void> {
    const view = this.#views.get(socket);
    this.#views.delete(socket);
    await view?.stop();
  }
}

import { applyImmutable, type Op } from "@earendil-works/chord/delta";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { ConversationTranscript, type ConversationView, type TranscriptView } from "@earendil-works/pi-durable";
import type { Answer } from "~/modules/directory-client/types.ts";
import type { EntryPage } from "~/modules/protocol/types.ts";
import { buildChatView } from "~/modules/transcript/service.ts";
import type { ChatView, Gap } from "~/modules/transcript/types.ts";

export interface EntryQuery {
  readonly minEntryId?: number;
  readonly maxEntryId?: number;
  readonly order?: "ascending" | "descending";
}
type Load = (query: EntryQuery, limit: number) => Promise<Answer<EntryPage>>;

/** One chat as this page holds it: the last view, which operations change, and every entry seen so far. */
export class ChatCopy {
  readonly #transcript: ConversationTranscript;
  readonly #show: (view: ChatView) => void;
  #view: ConversationView | undefined;

  constructor(load: Load, show: (view: ChatView) => void) {
    this.#show = show;
    this.#transcript = new ConversationTranscript(async (query, limit) => {
      const page = await load(query, limit);
      if (!page.ok) throw new Error(page.error.message);
      return page.value;
    });
  }

  /** The newest entry held, to continue from after a reconnect. */
  get after(): number | undefined {
    return this.#transcript.newest;
  }

  replace(view: ConversationView): void {
    this.#view = view;
    this.#publish(this.#transcript.merge(view));
  }

  apply(ops: readonly Op[]): void {
    if (this.#view !== undefined) this.replace(applyImmutable(this.#view, ops));
  }

  loadEarlier(): Promise<Answer<void>> {
    return this.#load(this.#transcript.loadEarlier(BACKGROUND_CONTEXT));
  }

  fillGap(gap: Gap): Promise<Answer<void>> {
    return this.#load(this.#transcript.fillGap(gap, BACKGROUND_CONTEXT));
  }

  async #load(loading: Promise<TranscriptView>): Promise<Answer<void>> {
    try {
      this.#publish(await loading);
      return { ok: true, value: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load messages";
      return { ok: false, error: { code: "failed", message } };
    }
  }

  #publish(view: TranscriptView): void {
    this.#show(buildChatView(view));
  }
}

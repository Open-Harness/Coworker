import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { type CommitPublication, type ConversationId, type Harness, LiveDoc, type LiveState } from "@earendil-works/pi-durable";
import type { ChatStatus } from "~/modules/protocol/types.ts";

export function statusOf(live: Readonly<LiveState> | undefined): ChatStatus {
  if (live?.run !== undefined) return "working";
  const reason = live?.runFailure?.reason;
  return reason === undefined || reason === "aborted" || reason === "reset" ? "idle" : "failed";
}

/** What each chat is doing, followed from the engine's commits. */
export class Statuses {
  readonly #known = new Map<number, ChatStatus>();

  async load(harness: Harness, chatIds: readonly number[]): Promise<void> {
    for (const id of chatIds) {
      this.#known.set(id, statusOf(await harness.snapshot(LiveDoc, id as ConversationId, BACKGROUND_CONTEXT)));
    }
  }

  of(chatId: number): ChatStatus {
    return this.#known.get(chatId) ?? "idle";
  }

  /** Whether a commit changed any chat's status. */
  follow(publication: CommitPublication): boolean {
    let changed = false;
    for (const change of publication.changes) {
      if (change.type !== "document" || change.kind !== "change") continue;
      if (change.record.kind !== LiveDoc.definition.kind || change.conversationId === undefined) continue;
      const status = statusOf(change.value as unknown as LiveState);
      if (this.of(change.conversationId) === status) continue;
      this.#known.set(change.conversationId, status);
      changed = true;
    }
    return changed;
  }
}

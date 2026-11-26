import { BACKGROUND_CONTEXT, type Context } from "@earendil-works/chord/context";
import type { Conversation, ConversationId, Tx } from "@earendil-works/pi-durable";
import type { By, Handler } from "~/modules/actions/types.ts";
import { BoardDoc } from "./state.ts";

/*
 * `run.stop`. The handler writes the run's end in the caller's commit; the run's conversation is told to stop once
 * that commit has landed (`abortRun`), by whoever pressed it. Stopping a run that already ended changes nothing.
 */

/** What a person or the manager is told: the run, whether this call stopped it, and the conversation to abort. */
export type Stopped = { readonly run: string; readonly task: string; readonly stopped: boolean; readonly conversationId?: number };

const failed = (message: string) => ({ ok: false, message }) as const;

export function stopHandler(tx: Tx, now: () => number): Handler {
  return async (input, by: By) => {
    const name = typeof input["run"] === "string" ? input["run"].trim() : "";
    const run = (await tx.doc(BoardDoc)).runs[name];
    if (run === undefined) return failed(`There is no run ${name}`);
    if (run.state === "ended") return { ok: true, value: { run: run.id, task: run.task, stopped: false } satisfies Stopped };
    run.state = "ended";
    run.report = "dropped";
    run.reportedAt = now();
    run.note = `Stopped by ${by.name}`;
    run.stopped = { at: now(), by: { kind: by.kind, id: by.id, name: by.name } };
    return { ok: true, value: { run: run.id, task: run.task, stopped: true, conversationId: run.conversationId } satisfies Stopped };
  };
}

/** The conversation a stopped run was in, from what the handler answered. */
export function stoppedConversation(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const { stopped, conversationId } = value as { stopped?: unknown; conversationId?: unknown };
  return stopped === true && typeof conversationId === "number" ? conversationId : undefined;
}

/** Ends what the run's conversation is doing: the answer being written, the tools it called, what waits for it. */
export async function abortRun(
  conversation: (id: ConversationId, context: Context) => Promise<Pick<Conversation, "abort"> | undefined>,
  conversationId: number,
): Promise<void> {
  await (await conversation(conversationId as ConversationId, BACKGROUND_CONTEXT))?.abort(BACKGROUND_CONTEXT);
}

import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import {
  type Conversation,
  ConversationBusy,
  ConversationIdle,
  type ConversationId,
  InboxDoc,
  LiveDoc,
  type SubmissionId,
  type TaskId,
} from "@earendil-works/pi-durable";
import type { Agent } from "~/modules/agent/types.ts";
import { chats } from "~/modules/chats/service.ts";
import { LIMITS } from "~/modules/protocol/service.ts";
import type { CommandOutcome, WorkspaceRequest } from "~/modules/protocol/types.ts";
import { listSchedules } from "~/modules/schedule/service.ts";
import { attributedText, AuthoredEntry } from "~/modules/transcript/service.ts";
import type { Author } from "~/modules/transcript/types.ts";
import type { Engine } from "./engine.ts";
import { done, refused, refusedBy, succeeded } from "./outcome.ts";

type Command<T extends WorkspaceRequest["type"]> = Extract<WorkspaceRequest, { readonly type: T }>;
type Opened = { readonly ok: true; readonly conversation: Conversation } | { readonly ok: false; readonly outcome: CommandOutcome };

async function openConversation({ harness }: Engine, chatId: number): Promise<Opened> {
  const known = await harness.commit((tx) => chats.find(tx, chatId), BACKGROUND_CONTEXT);
  if (!known.ok) return { ok: false, outcome: refusedBy(known) };
  const conversation = await harness.conversation(known.value, BACKGROUND_CONTEXT);
  return conversation === undefined
    ? { ok: false, outcome: refused("not_found", `Chat ${chatId} does not exist`) }
    : { ok: true, conversation };
}

/** Why a new prompt cannot be taken, if it cannot. */
async function refusal(engine: Engine, agent: Agent, chatId: ConversationId): Promise<CommandOutcome | undefined> {
  if (agent.models.length === 0) return refused("no_model", "No model provider has a key on the server");
  const { budgetUsd } = await agent.settings(engine.harness, BACKGROUND_CONTEXT);
  if (budgetUsd !== undefined && (await agent.usage(engine.harness, BACKGROUND_CONTEXT)).costUsd >= budgetUsd) {
    return refused("budget_reached", `This workspace has used its budget of $${budgetUsd.toFixed(2)}`);
  }
  const inbox = await engine.harness.snapshot(InboxDoc, chatId, BACKGROUND_CONTEXT);
  const queued = inbox?.items.filter(({ mode }) => mode !== "write").length ?? 0;
  return queued >= LIMITS.queuedPrompts
    ? refused("queue_full", `${LIMITS.queuedPrompts} prompts are already waiting in this chat`)
    : undefined;
}

export async function submitPrompt(
  engine: Engine,
  agent: Agent,
  command: Command<"prompt.submit">,
  author: Author,
): Promise<CommandOutcome> {
  const { chatId, requestId, content, whenBusy } = command;
  const opened = await openConversation(engine, chatId);
  if (!opened.ok) return opened.outcome;
  const { conversation } = opened;
  // A replayed prompt was accepted before; limits reached since must not turn that into a refusal.
  const replayed = await engine.harness.commit((tx) => tx.submissionByRequest(conversation.id, requestId), BACKGROUND_CONTEXT);
  if (replayed !== undefined) return succeeded({ kind: "submitted", submissionId: replayed.id });
  const refusedNow = await refusal(engine, agent, conversation.id);
  if (refusedNow !== undefined) return refusedNow;
  await engine.expectWork();
  const { maxTurns } = await agent.settings(engine.harness, BACKGROUND_CONTEXT);
  await conversation.configure({ maxTurns }, BACKGROUND_CONTEXT);
  const submission = await conversation.submit(
    {
      type: "input",
      content: attributedText(author, content),
      entry: { kind: AuthoredEntry.kind, data: { author: { id: author.id, name: author.name } } },
      requestId,
      whenBusy,
    },
    BACKGROUND_CONTEXT,
  );
  await engine.harness.commit((tx) => chats.notePrompt(tx, chatId, content, Date.now()), BACKGROUND_CONTEXT);
  return succeeded({ kind: "submitted", submissionId: submission.id });
}

export async function withdrawPrompt(engine: Engine, command: Command<"prompt.withdraw">): Promise<CommandOutcome> {
  const result = await engine.harness.abortSubmission(
    command.submissionId as SubmissionId,
    BACKGROUND_CONTEXT,
    command.chatId as ConversationId,
  );
  if (result === "already_placed") return refused("rejected", "The prompt has already been taken up");
  return result === "not_found" ? refused("not_found", "That prompt does not exist") : done;
}

const HAND_OVERS = 5;

/** Generations hand a run on to one another; one that just did is not the run's end. */
async function endRun({ harness }: Engine, chatId: ConversationId): Promise<void> {
  const run = async () => (await harness.snapshot(LiveDoc, chatId, BACKGROUND_CONTEXT))?.run;
  const first = (await run())?.first;
  for (let tries = 0; tries < HAND_OVERS; tries++) {
    const current = await run();
    if (current === undefined || current.first !== first) return;
    await harness.abortTask(current.taskId, BACKGROUND_CONTEXT);
    await harness.waitForTask(current.taskId, BACKGROUND_CONTEXT);
  }
}

/**
 * Stops the answer being written. Unlike the engine's own abort, what others have waiting is not thrown away: it is
 * answered next.
 */
export async function stopRun(engine: Engine, { chatId, requestId }: Command<"run.stop">): Promise<CommandOutcome> {
  const opened = await openConversation(engine, chatId);
  if (!opened.ok) return opened.outcome;
  const { conversation } = opened;
  await engine.expectWork();
  await endRun(engine, conversation.id);
  const waiting = (await engine.harness.snapshot(InboxDoc, conversation.id, BACKGROUND_CONTEXT))?.items ?? [];
  if (waiting.every(({ mode }) => mode === "write")) {
    // Nobody waits, so there is nothing to lose; this also stops a summary on its way.
    await conversation.abort(BACKGROUND_CONTEXT);
    return done;
  }
  try {
    await conversation.submit({ type: "continue", requestId }, BACKGROUND_CONTEXT);
  } catch (error) {
    // Something said meanwhile already started the next run, with what waited.
    if (!(error instanceof ConversationBusy)) throw error;
  }
  return done;
}

export async function continueRun(engine: Engine, command: Command<"run.continue">): Promise<CommandOutcome> {
  const opened = await openConversation(engine, command.chatId);
  if (!opened.ok) return opened.outcome;
  await engine.expectWork();
  try {
    const submission = await opened.conversation.submit({ type: "continue", requestId: command.requestId }, BACKGROUND_CONTEXT);
    return succeeded({ kind: "submitted", submissionId: submission.id });
  } catch (error) {
    if (error instanceof ConversationBusy) return refused("rejected", "The chat is already running");
    if (error instanceof ConversationIdle) return refused("rejected", "There is nothing to continue");
    throw error;
  }
}

export async function compactChat(engine: Engine, chatId: number): Promise<CommandOutcome> {
  const opened = await openConversation(engine, chatId);
  if (!opened.ok) return opened.outcome;
  await engine.expectWork();
  await opened.conversation.compact(undefined, BACKGROUND_CONTEXT);
  return done;
}

/** Only scheduled instructions can be cancelled this way; the engine's own tasks belong to their runs. */
export async function cancelSchedule(engine: Engine, taskId: number): Promise<CommandOutcome> {
  const schedules = await listSchedules(engine.harness, BACKGROUND_CONTEXT);
  if (!schedules.some((schedule) => schedule.taskId === taskId)) {
    return refused("not_found", "That schedule does not exist or has already run");
  }
  await engine.harness.abortTask(taskId as TaskId, BACKGROUND_CONTEXT);
  return done;
}

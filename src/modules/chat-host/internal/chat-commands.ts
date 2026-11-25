import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { configure, type ConversationId, type EntryId, type TaskId } from "@earendil-works/pi-durable";
import type { Agent } from "~/modules/agent/types.ts";
import { chats } from "~/modules/chats/service.ts";
import { listSchedules } from "~/modules/schedule/service.ts";
import type { CommandOutcome, WorkspaceRequest } from "~/modules/protocol/types.ts";
import type { Author } from "~/modules/transcript/types.ts";
import type { RelayedCommand } from "../types.ts";
import type { Engine } from "./engine.ts";
import { done, refused, refusedBy, succeeded } from "./outcome.ts";

type Command<T extends WorkspaceRequest["type"]> = Extract<WorkspaceRequest, { readonly type: T }>;

/** Commands from the sidebar, which may come from a page that has another workspace open. */
export async function runRelayed(engine: Engine, agent: Agent, command: RelayedCommand, by: Author): Promise<CommandOutcome> {
  const now = Date.now();
  switch (command.type) {
    case "chat.create": {
      const created = await createChat(engine, agent, command, by, now);
      return created.ok ? succeeded({ kind: "chat", chatId: created.value }) : refusedBy(created);
    }
    case "chat.update": {
      const { chatId, change } = command;
      const updated = await engine.harness.commit((tx) => chats.update(tx, chatId, change, now), BACKGROUND_CONTEXT);
      return updated.ok ? done : refusedBy(updated);
    }
    case "chat.delete":
      return removeChat(engine, command.chatId, now);
  }
}

function createChat(engine: Engine, agent: Agent, command: Extract<RelayedCommand, { type: "chat.create" }>, by: Author, now: number) {
  const { requestId, agent: assigned } = command;
  return engine.harness.commit(
    (tx) =>
      assigned === undefined
        ? chats.create(tx, { requestId, by, now })
        : chats.create(tx, { requestId, by, now, agent: assigned.stamp }, (chatId) => agent.assign(tx, chatId, assigned.config)),
    BACKGROUND_CONTEXT,
  );
}

/** Deleting stops the chat's run and its schedules, so nothing keeps spending where nobody can see it. */
async function removeChat(engine: Engine, chatId: number, now: number): Promise<CommandOutcome> {
  const removed = await engine.harness.commit((tx) => chats.remove(tx, chatId, now), BACKGROUND_CONTEXT);
  if (!removed.ok) return done;
  for (const schedule of await listSchedules(engine.harness, BACKGROUND_CONTEXT)) {
    if (schedule.chatId === chatId) await engine.harness.abortTask(schedule.taskId as TaskId, BACKGROUND_CONTEXT);
  }
  const conversation = await engine.harness.conversation(removed.value, BACKGROUND_CONTEXT);
  await conversation?.abort(BACKGROUND_CONTEXT, { background: true });
  return done;
}

export async function forkChat(engine: Engine, command: Command<"chat.fork">, by: Author): Promise<CommandOutcome> {
  const { requestId, chatId } = command;
  const entryId = command.entryId as EntryId;
  const forked = await engine.harness.commit(
    (tx) => chats.fork(tx, { requestId, by, now: Date.now(), chatId, entryId }),
    BACKGROUND_CONTEXT,
  );
  return forked.ok ? succeeded({ kind: "chat", chatId: forked.value }) : refusedBy(forked);
}

export async function readEntries(engine: Engine, command: Command<"chat.entries">): Promise<CommandOutcome> {
  const { chatId, minEntryId, maxEntryId, order, limit } = command;
  const known = await engine.harness.commit((tx) => chats.find(tx, chatId), BACKGROUND_CONTEXT);
  if (!known.ok) return refusedBy(known);
  const conversation = await engine.harness.conversation(known.value, BACKGROUND_CONTEXT);
  if (conversation === undefined) return refused("not_found", `Chat ${chatId} does not exist`);
  const page = await conversation.entries(
    {
      ...(minEntryId === undefined ? {} : { minEntryId: minEntryId as EntryId }),
      ...(maxEntryId === undefined ? {} : { maxEntryId: maxEntryId as EntryId }),
      order,
    },
    limit,
    undefined,
    BACKGROUND_CONTEXT,
  );
  return succeeded({ kind: "entries", page: { items: page.items, ...(page.next === undefined ? {} : { next: page.next }) } });
}

export async function configureChat(
  engine: Engine,
  command: Command<"chat.configure">,
  isAvailable: (model: NonNullable<Command<"chat.configure">["model"]>) => boolean,
): Promise<CommandOutcome> {
  const { chatId, model, thinkingLevel } = command;
  if (model !== undefined && !isAvailable(model)) return refused("rejected", "That model is not available");
  return engine.harness.commit(async (tx) => {
    const known = await chats.find(tx, chatId);
    if (!known.ok) return refusedBy(known);
    const chat = (await chats.list(tx)).find(({ id }) => id === chatId);
    if (chat?.agent !== undefined) return refused("rejected", "The agent of this chat decides its model");
    await configure(tx, known.value as ConversationId, {
      ...(model === undefined ? {} : { model }),
      ...(thinkingLevel === undefined ? {} : { thinkingLevel }),
    });
    return done;
  }, BACKGROUND_CONTEXT);
}

import { bool, int, lit, nullable, num, obj, oneOf, opt, type Schema, str, union } from "@earendil-works/pi-schema";
import type { DirectoryCommand, WorkspaceCommand } from "../types.ts";
import { adminCommands } from "./agents.ts";
import { LIMITS } from "./limits.ts";
import {
  modelRef,
  natural as entryBound,
  positive as chatId,
  requestId,
  text,
  thinkingLevel,
  title,
  uuid as workspaceId,
} from "./values.ts";

const rowChange = obj({ title: opt(title), pinned: opt(bool()), archived: opt(bool()) });

export const directoryCommand: Schema<DirectoryCommand> = union([
  obj({ type: lit("workspace.create"), requestId, workspaceId, name: title }),
  obj({ type: lit("workspace.update"), requestId, workspaceId, change: rowChange }),
  obj({ type: lit("workspace.delete"), requestId, workspaceId }),
  obj({ type: lit("chat.create"), requestId, workspaceId, agentId: opt(workspaceId) }),
  obj({ type: lit("chat.update"), requestId, workspaceId, chatId, change: rowChange }),
  obj({ type: lit("chat.delete"), requestId, workspaceId, chatId }),
  ...adminCommands,
]);

const settingsChange = obj({
  model: opt(modelRef),
  thinkingLevel: opt(thinkingLevel),
  instructions: opt(str({ maxLength: LIMITS.instructions })),
  budgetUsd: opt(nullable(num({ minimum: 0, maximum: 1_000_000 }))),
  maxTurns: opt(int({ minimum: 1, maximum: 500 })),
});

export const workspaceCommand: Schema<WorkspaceCommand> = union([
  obj({ type: lit("presence.typing"), chatId, typing: bool() }),
  obj({ type: lit("chat.open"), requestId, chatId, after: opt(entryBound) }),
  obj({ type: lit("chat.leave"), requestId }),
  obj({
    type: lit("chat.entries"),
    requestId,
    chatId,
    minEntryId: opt(entryBound),
    maxEntryId: opt(entryBound),
    order: oneOf(["ascending", "descending"]),
    limit: int({ minimum: 1, maximum: LIMITS.entryPage }),
  }),
  obj({ type: lit("chat.fork"), requestId, chatId, entryId: chatId }),
  obj({
    type: lit("chat.configure"),
    requestId,
    chatId,
    model: opt(modelRef),
    thinkingLevel: opt(thinkingLevel),
  }),
  obj({ type: lit("chat.compact"), requestId, chatId }),
  obj({
    type: lit("prompt.submit"),
    requestId,
    chatId,
    content: text(LIMITS.prompt),
    whenBusy: oneOf(["followUp", "steer"]),
  }),
  obj({ type: lit("prompt.withdraw"), requestId, chatId, submissionId: chatId }),
  obj({ type: lit("run.stop"), requestId, chatId }),
  obj({ type: lit("run.continue"), requestId, chatId }),
  obj({ type: lit("task.cancel"), requestId, taskId: chatId }),
  obj({ type: lit("document.read"), requestId, documentId: text(64), version: opt(chatId) }),
  obj({ type: lit("history.search"), requestId, term: text(200) }),
  obj({ type: lit("settings.update"), requestId, change: settingsChange }),
]);

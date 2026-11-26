import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { chats } from "~/modules/chats/service.ts";
import { documents } from "~/modules/documents/service.ts";
import { searchHistory } from "~/modules/history/service.ts";
import type { CommandOutcome, WorkspaceRequest } from "~/modules/protocol/types.ts";
import type { Agent } from "~/modules/agent/types.ts";
import { configureChat, forkChat, readEntries } from "./chat-commands.ts";
import type { Connections } from "./connections.ts";
import type { Engine } from "./engine.ts";
import { done, refused, refusedBy, succeeded } from "./outcome.ts";
import { cancelSchedule, compactChat, continueRun, stopRun, submitPrompt, withdrawPrompt } from "./run-commands.ts";
import type { Room } from "./room.ts";
import type { Watches } from "./watches.ts";

export interface Session {
  readonly engine: Engine;
  readonly room: Room;
  readonly agent: Agent;
  readonly connections: Connections;
  readonly watches: Watches;
}

async function openChat(session: Session, socket: WebSocket, chatId: number, after?: number): Promise<CommandOutcome> {
  const { engine, connections, watches, room } = session;
  const state = connections.state(socket);
  if (state === undefined) return refused("failed", "The connection has no person");
  const known = await engine.harness.commit((tx) => chats.find(tx, chatId), BACKGROUND_CONTEXT);
  if (!known.ok) return refusedBy(known);
  connections.setState(socket, { person: state.person, chatId });
  if (!(await watches.open(engine.harness, socket, chatId, after))) return refused("not_found", "That chat is gone");
  room.showPresence();
  return done;
}

async function leaveChat({ connections, watches, room }: Session, socket: WebSocket): Promise<CommandOutcome> {
  const state = connections.state(socket);
  await watches.stop(socket);
  if (state !== undefined) connections.setState(socket, { person: state.person });
  room.showPresence();
  return done;
}

async function readDocument({ engine }: Session, documentId: string, version?: number): Promise<CommandOutcome> {
  const document = await documents.read(engine.harness, documentId, version, BACKGROUND_CONTEXT);
  return document === undefined
    ? refused("not_found", "That document or version is no longer kept")
    : succeeded({ kind: "document", document });
}

const isAvailable = (agent: Agent) => (model: { readonly provider: string; readonly modelId: string }) =>
  agent.models.some((option) => option.provider === model.provider && option.modelId === model.modelId);

async function updateSettings(
  { agent, engine }: Session,
  change: Extract<WorkspaceRequest, { readonly type: "settings.update" }>["change"],
): Promise<CommandOutcome> {
  if (change.model !== undefined && !isAvailable(agent)(change.model)) {
    return refused("rejected", "That model is not available");
  }
  await agent.updateSettings(engine.harness, change, BACKGROUND_CONTEXT);
  return done;
}

export function setTyping({ connections, room }: Session, socket: WebSocket, chatId: number, typing: boolean): void {
  const state = connections.state(socket);
  if (state === undefined || state.chatId !== chatId || (state.typing === true) === typing) return;
  connections.setState(socket, { person: state.person, chatId, ...(typing ? { typing: true } : {}) });
  room.showPresence();
}

/** One command from a page. */
export async function runCommand(session: Session, socket: WebSocket, command: WorkspaceRequest): Promise<CommandOutcome> {
  const { engine, agent } = session;
  const person = session.connections.state(socket)?.person;
  if (person === undefined) return refused("failed", "The connection has no person");
  switch (command.type) {
    case "chat.open":
      return openChat(session, socket, command.chatId, command.after);
    case "chat.leave":
      return leaveChat(session, socket);
    case "chat.entries":
      return readEntries(engine, command);
    case "chat.fork":
      return forkChat(engine, command, person);
    case "chat.configure":
      return configureChat(engine, command, isAvailable(agent));
    case "chat.compact":
      return compactChat(engine, command.chatId);
    case "prompt.submit":
      setTyping(session, socket, command.chatId, false);
      return submitPrompt(engine, agent, command, person);
    case "prompt.withdraw":
      return withdrawPrompt(engine, command);
    case "run.stop":
      return stopRun(engine, command);
    case "run.continue":
      return continueRun(engine, command);
    case "task.cancel":
      return cancelSchedule(engine, command.taskId);
    case "document.read":
      return readDocument(session, command.documentId, command.version);
    case "history.search": {
      const found = await searchHistory(engine.harness, command.term, BACKGROUND_CONTEXT);
      return succeeded({ kind: "matches", ...found });
    }
    case "settings.update":
      return updateSettings(session, command.change);
  }
}

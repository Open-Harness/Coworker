import { Store } from "@tanstack/store";
import type { Connection, Unsent } from "~/modules/connection/types.ts";
import type { Answer } from "~/modules/directory-client/types.ts";
import { LIMITS, newId, parseWorkspaceEvent } from "~/modules/protocol/service.ts";
import type { WorkspaceEvent, WorkspaceRequest } from "~/modules/protocol/types.ts";
import { answerOf } from "./internal/answers.ts";
import { ChatCopy } from "./internal/chat-copy.ts";
import type { WorkspaceClient, WorkspaceClientDependencies, WorkspacePage } from "./types.ts";

type Command = Unsent<WorkspaceRequest>;
const READ = { lasting: false } as const;
const nothing: Answer<void> = { ok: true, value: undefined };

class LiveWorkspaceClient implements WorkspaceClient {
  readonly id: string;
  readonly state = new Store<WorkspacePage>({ status: "connecting", models: [], chats: {}, closed: [] });
  readonly #connection: Connection<WorkspaceRequest>;
  readonly #copies = new Map<number, ChatCopy>();
  #open: number | undefined;
  #typing: number | undefined;

  constructor({ workspaceId, connect, open, onError }: WorkspaceClientDependencies) {
    this.id = workspaceId;
    this.#connection = connect({
      open,
      parse: parseWorkspaceEvent,
      onEvent: (event) => this.#receive(event),
      onStatus: (status) => this.#set({ status }),
      onError,
      onOpen: () => (this.#open === undefined ? [] : [this.#openCommand(this.#open)]),
    });
  }

  openChat(chatId: number): void {
    if (this.#open === chatId) return;
    this.#open = chatId;
    this.#connection.notify(this.#openCommand(chatId));
  }

  leaveChat(chatId: number): void {
    if (this.#open !== chatId) return;
    this.#open = undefined;
    this.#typing = undefined;
    this.#connection.notify({ type: "chat.leave", requestId: newId() });
  }

  setTyping(chatId: number, typing: boolean): void {
    if ((this.#typing === chatId) === typing) return;
    this.#typing = typing ? chatId : undefined;
    this.#connection.notify({ type: "presence.typing", chatId, typing });
  }

  loadEarlier(chatId: number) {
    return this.#copies.get(chatId)?.loadEarlier() ?? Promise.resolve(nothing);
  }
  fillGap(chatId: number, gap: Parameters<WorkspaceClient["fillGap"]>[1]) {
    return this.#copies.get(chatId)?.fillGap(gap) ?? Promise.resolve(nothing);
  }
  async submit(chatId: number, content: string, whenBusy: "followUp" | "steer"): Promise<Answer<void>> {
    // The server takes a prompt as the end of typing.
    this.#typing = undefined;
    const outcome = await this.#connection.send({ type: "prompt.submit", chatId, content, whenBusy });
    return answerOf(outcome, "submitted", () => undefined);
  }
  withdraw(chatId: number, submissionId: number) {
    return this.#change({ type: "prompt.withdraw", chatId, submissionId });
  }
  stop(chatId: number) {
    return this.#change({ type: "run.stop", chatId });
  }
  continueRun(chatId: number) {
    return this.#change({ type: "run.continue", chatId });
  }
  compact(chatId: number) {
    return this.#change({ type: "chat.compact", chatId });
  }
  configure(chatId: number, change: Parameters<WorkspaceClient["configure"]>[1]) {
    return this.#change({ type: "chat.configure", chatId, ...change });
  }
  async fork(chatId: number, entryId: number): Promise<Answer<number>> {
    const outcome = await this.#connection.send({ type: "chat.fork", chatId, entryId });
    return answerOf(outcome, "chat", (output) => output.chatId);
  }
  cancelTask(taskId: number) {
    return this.#change({ type: "task.cancel", taskId });
  }
  async readDocument(documentId: string, version?: number) {
    const command: Command = { type: "document.read", documentId, ...(version === undefined ? {} : { version }) };
    return answerOf(await this.#connection.send(command, READ), "document", (output) => output.document);
  }
  async search(term: string) {
    const outcome = await this.#connection.send({ type: "history.search", term }, READ);
    return answerOf(outcome, "matches", ({ matches, truncated }) => ({ matches, truncated }));
  }
  updateSettings(change: Parameters<WorkspaceClient["updateSettings"]>[0]) {
    return this.#change({ type: "settings.update", change });
  }
  close(): void {
    this.#connection.close();
  }

  async #change(command: Command): Promise<Answer<void>> {
    const outcome = await this.#connection.send(command);
    return outcome.ok ? nothing : { ok: false, error: outcome.error };
  }

  #openCommand(chatId: number): WorkspaceRequest {
    const after = this.#copies.get(chatId)?.after;
    return { type: "chat.open", requestId: newId(), chatId, ...(after === undefined ? {} : { after }) };
  }

  #set(change: Partial<WorkspacePage>): void {
    this.state.setState((before) => ({ ...before, ...change }));
  }

  #copy(chatId: number): ChatCopy {
    const known = this.#copies.get(chatId);
    if (known !== undefined) return known;
    const copy = new ChatCopy(
      async (query, limit) => {
        const command: Command = {
          type: "chat.entries",
          chatId,
          order: query.order ?? "ascending",
          limit: Math.min(limit, LIMITS.entryPage),
          ...(query.minEntryId === undefined ? {} : { minEntryId: query.minEntryId }),
          ...(query.maxEntryId === undefined ? {} : { maxEntryId: query.maxEntryId }),
        };
        return answerOf(await this.#connection.send(command, READ), "entries", (output) => output.page);
      },
      (view) => this.state.setState((before) => ({ ...before, chats: { ...before.chats, [chatId]: view } })),
    );
    this.#copies.set(chatId, copy);
    return copy;
  }

  #receive(event: WorkspaceEvent): void {
    switch (event.type) {
      case "workspace.snapshot":
        this.#typing = undefined;
        return this.#set({ me: event.me, models: event.models, workspace: event.state });
      case "workspace.patch": {
        const { workspace } = this.state.get();
        return workspace === undefined ? undefined : this.#set({ workspace: { ...workspace, ...event.patch } });
      }
      case "chat.view":
        return this.#copy(event.chatId).replace(event.view);
      case "chat.ops":
        return this.#copy(event.chatId).apply(event.ops);
      case "chat.closed":
        this.#copies.delete(event.chatId);
        return this.#set({ closed: [...this.state.get().closed, event.chatId] });
      case "command.result":
      case "error":
        return;
    }
  }
}

export const createWorkspaceClient = (dependencies: WorkspaceClientDependencies): WorkspaceClient => new LiveWorkspaceClient(dependencies);

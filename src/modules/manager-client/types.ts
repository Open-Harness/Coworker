import type { Connection, ConnectionOptions, ConnectionStatus } from "~/modules/connection/types.ts";
import type { Answer, Source } from "~/modules/directory-client/types.ts";
import type { Person } from "~/modules/protocol/types.ts";
import type {
  DocumentVersion,
  ModelOption,
  ModelRef,
  SearchMatch,
  SettingsChange,
  ThinkingLevel,
  WorkspaceCommand,
  WorkspaceEvent,
  WorkspaceRequest,
  WorkspaceState,
} from "~/modules/protocol/types.ts";
import type { ChatView, Gap } from "~/modules/transcript/types.ts";

export interface WorkspacePage {
  readonly status: ConnectionStatus;
  readonly me?: Person;
  readonly models: readonly ModelOption[];
  /** Absent until the first snapshot. */
  readonly workspace?: WorkspaceState;
  /** Chats opened in this page, as last seen. */
  readonly chats: Readonly<Record<number, ChatView>>;
  /** Chats deleted while this page had them. */
  readonly closed: readonly number[];
}

/** The page's copy of one workspace and of the chats opened in it. */
export interface WorkspaceClient {
  readonly id: string;
  readonly state: Source<WorkspacePage>;
  /** Follows a chat from now on, across reconnects, in place of the one followed before. */
  openChat(chatId: number): void;
  /** Stops following, unless another chat was opened since. */
  leaveChat(chatId: number): void;
  /** Says whether this person is typing. Repeating it costs nothing. */
  setTyping(chatId: number, typing: boolean): void;
  loadEarlier(chatId: number): Promise<Answer<void>>;
  fillGap(chatId: number, gap: Gap): Promise<Answer<void>>;
  submit(chatId: number, content: string, whenBusy: "followUp" | "steer"): Promise<Answer<void>>;
  withdraw(chatId: number, submissionId: number): Promise<Answer<void>>;
  stop(chatId: number): Promise<Answer<void>>;
  continueRun(chatId: number): Promise<Answer<void>>;
  compact(chatId: number): Promise<Answer<void>>;
  configure(chatId: number, change: { readonly model?: ModelRef; readonly thinkingLevel?: ThinkingLevel }): Promise<Answer<void>>;
  fork(chatId: number, entryId: number): Promise<Answer<number>>;
  cancelTask(taskId: number): Promise<Answer<void>>;
  readDocument(documentId: string, version?: number): Promise<Answer<DocumentVersion>>;
  search(term: string): Promise<Answer<{ readonly matches: readonly SearchMatch[]; readonly truncated: boolean }>>;
  updateSettings(change: SettingsChange): Promise<Answer<void>>;
  close(): void;
}

export interface WorkspaceClientDependencies {
  readonly workspaceId: string;
  readonly connect: (options: ConnectionOptions<WorkspaceRequest, WorkspaceEvent>) => Connection<WorkspaceRequest>;
  readonly open: ConnectionOptions<WorkspaceCommand, WorkspaceEvent>["open"];
  readonly onError: (message: string) => void;
}

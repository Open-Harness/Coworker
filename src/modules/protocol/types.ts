import type { Op } from "@earendil-works/chord/delta";
import type { ConversationView, Cursor, EntryRecord, TaskGraph } from "@earendil-works/pi-durable";
import type { AgentConfig, AgentRow, AgentStamp, DeployedTo, ModelRef, ThinkingLevel } from "~/modules/agent-config/types.ts";

/*
 * Everything that crosses a WebSocket. Two sockets: the directory (navigation: workspaces, chats, documents) and one
 * workspace (the open chat). Every command carries a request id that stays the same across reconnects, so replaying it
 * never repeats its effect.
 */

export type { ModelRef, ThinkingLevel } from "~/modules/agent-config/types.ts";

/** Who someone is: a signed-in account, as `email:<address>` with their name. */
export interface Person {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string;
}

export interface ModelOption extends ModelRef {
  readonly label: string;
  readonly thinkingLevels: readonly ThinkingLevel[];
}

export type ChatStatus = "idle" | "working" | "failed";
export interface ChatRow {
  readonly id: number;
  readonly title: string;
  readonly pinned: boolean;
  readonly archivedAt?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly createdBy: string;
  readonly status: ChatStatus;
  /** The chat this one was forked from. */
  readonly parentId?: number;
  /** The deployed agent that answers here, as it was when the chat began. Absent: the workspace's assistant. */
  readonly agent?: AgentStamp;
}
export interface DocumentRow {
  readonly id: string;
  readonly title: string;
  /** `markdown`, or the language of a code document. */
  readonly language: string;
  readonly version: number;
  /** Versions still kept, oldest first. */
  readonly versions: readonly number[];
  readonly chatId: number;
  readonly updatedAt: number;
}
export interface DocumentVersion {
  readonly documentId: string;
  readonly title: string;
  readonly language: string;
  readonly version: number;
  readonly content: string;
  readonly savedAt: number;
}
export interface ScheduleRow {
  readonly taskId: number;
  readonly chatId: number;
  readonly instruction: string;
  readonly runAt: number;
  readonly repeats?: string;
}
export interface WorkspaceSettings {
  readonly model?: ModelRef;
  readonly thinkingLevel: ThinkingLevel;
  readonly instructions: string;
  /** New prompts are refused once the workspace has spent this much. Absent: no limit. */
  readonly budgetUsd?: number;
  /** Tool rounds one run may take. */
  readonly maxTurns: number;
}
export interface UsageSummary {
  readonly costUsd: number;
  readonly models: readonly { readonly model: string; readonly costUsd: number; readonly tokens: number }[];
}
export interface Presence {
  readonly person: Person;
  readonly chatId?: number;
  readonly typing: boolean;
}
export interface SearchMatch {
  readonly chatId: number;
  readonly entryId: number;
  readonly role: "user" | "assistant";
  readonly snippet: string;
}
export interface WorkspaceRow {
  readonly id: string;
  readonly name: string;
  readonly pinned: boolean;
  readonly archivedAt?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly createdBy: string;
  readonly chats: readonly ChatRow[];
  readonly documents: readonly DocumentRow[];
}

export interface RowChange {
  readonly title?: string;
  readonly pinned?: boolean;
  readonly archived?: boolean;
}
export interface SettingsChange {
  readonly model?: ModelRef;
  readonly thinkingLevel?: ThinkingLevel;
  readonly instructions?: string;
  readonly budgetUsd?: number | null;
  readonly maxTurns?: number;
}

type Request = { readonly requestId: string };
/** What only an administrator may do. */
export type AdminCommand =
  /** `basedOn`: the version the change started from, 0 for a new agent. */
  | { readonly type: "agent.save"; readonly agentId: string; readonly basedOn: number; readonly config: AgentConfig }
  | { readonly type: "agent.deploy"; readonly agentId: string; readonly version: number; readonly to: DeployedTo }
  | { readonly type: "agent.retire"; readonly agentId: string }
  | { readonly type: "agent.delete"; readonly agentId: string }
  | { readonly type: "agent.read"; readonly agentId: string; readonly version: number }
  /** Asks the default model to write a config. */
  | { readonly type: "agent.draft"; readonly description: string };
export type DirectoryCommand = Request &
  (
    | { readonly type: "workspace.create"; readonly workspaceId: string; readonly name: string }
    | { readonly type: "workspace.update"; readonly workspaceId: string; readonly change: RowChange }
    | { readonly type: "workspace.delete"; readonly workspaceId: string }
    | { readonly type: "chat.create"; readonly workspaceId: string; readonly agentId?: string }
    | { readonly type: "chat.update"; readonly workspaceId: string; readonly chatId: number; readonly change: RowChange }
    | { readonly type: "chat.delete"; readonly workspaceId: string; readonly chatId: number }
    | AdminCommand
  );

type InChat = Request & { readonly chatId: number };
export type WorkspaceCommand =
  | { readonly type: "presence.typing"; readonly chatId: number; readonly typing: boolean }
  /** `after`: the newest entry the client holds, to continue from after a reconnect. */
  | (InChat & { readonly type: "chat.open"; readonly after?: number })
  | (Request & { readonly type: "chat.leave" })
  | (InChat & {
      readonly type: "chat.entries";
      readonly minEntryId?: number;
      readonly maxEntryId?: number;
      readonly order: "ascending" | "descending";
      readonly limit: number;
    })
  | (InChat & { readonly type: "chat.fork"; readonly entryId: number })
  | (InChat & { readonly type: "chat.configure"; readonly model?: ModelRef; readonly thinkingLevel?: ThinkingLevel })
  | (InChat & { readonly type: "chat.compact" })
  | (InChat & { readonly type: "prompt.submit"; readonly content: string; readonly whenBusy: "followUp" | "steer" })
  | (InChat & { readonly type: "prompt.withdraw"; readonly submissionId: number })
  | (InChat & { readonly type: "run.stop" })
  | (InChat & { readonly type: "run.continue" })
  | (Request & { readonly type: "task.cancel"; readonly taskId: number })
  | (Request & { readonly type: "document.read"; readonly documentId: string; readonly version?: number })
  | (Request & { readonly type: "history.search"; readonly term: string })
  | (Request & { readonly type: "settings.update"; readonly change: SettingsChange });
export type WorkspaceRequest = Exclude<WorkspaceCommand, { readonly type: "presence.typing" }>;

export interface EntryPage {
  readonly items: readonly EntryRecord[];
  readonly next?: Cursor;
}
export type CommandOutput =
  | { readonly kind: "done" }
  | { readonly kind: "chat"; readonly chatId: number }
  | { readonly kind: "submitted"; readonly submissionId: number }
  | { readonly kind: "entries"; readonly page: EntryPage }
  | { readonly kind: "document"; readonly document: DocumentVersion }
  | { readonly kind: "agent"; readonly config: AgentConfig }
  | { readonly kind: "matches"; readonly matches: readonly SearchMatch[]; readonly truncated: boolean };
export type CommandErrorCode =
  | "invalid"
  | "not_found"
  | "rejected"
  | "budget_reached"
  | "queue_full"
  | "no_model"
  | "forbidden"
  | "conflict"
  | "unavailable"
  | "failed";
export interface CommandError {
  readonly code: CommandErrorCode;
  readonly message: string;
}
export type CommandOutcome = { readonly ok: true; readonly output: CommandOutput } | { readonly ok: false; readonly error: CommandError };
export type CommandResult = { readonly type: "command.result"; readonly requestId: string } & CommandOutcome;

export interface ProtocolError {
  readonly type: "error";
  readonly message: string;
}
export type DirectoryEvent =
  | {
      readonly type: "directory.snapshot";
      readonly protocol: number;
      readonly me: Person;
      readonly models: readonly ModelOption[];
      readonly workspaces: readonly WorkspaceRow[];
      readonly people: readonly Person[];
      readonly agents: readonly AgentRow[];
      readonly isAdmin: boolean;
    }
  | { readonly type: "agent.changed"; readonly agent: AgentRow }
  | { readonly type: "agent.removed"; readonly agentId: string }
  | { readonly type: "workspace.changed"; readonly workspace: WorkspaceRow }
  | { readonly type: "workspace.removed"; readonly workspaceId: string }
  | { readonly type: "people.changed"; readonly people: readonly Person[] }
  | CommandResult
  | ProtocolError;

export interface WorkspaceState {
  readonly name: string;
  readonly settings: WorkspaceSettings;
  readonly usage: UsageSummary;
  readonly documents: readonly DocumentRow[];
  readonly schedules: readonly ScheduleRow[];
  readonly activity: TaskGraph;
  readonly presence: readonly Presence[];
}
export type WorkspaceEvent =
  | {
      readonly type: "workspace.snapshot";
      readonly protocol: number;
      readonly workspaceId: string;
      readonly me: Person;
      readonly models: readonly ModelOption[];
      readonly state: WorkspaceState;
    }
  | { readonly type: "workspace.patch"; readonly patch: Partial<WorkspaceState> }
  /** A window over the chat's transcript and the engine's live documents, as a watch starts. */
  | { readonly type: "chat.view"; readonly chatId: number; readonly view: ConversationView }
  /** Changes to the last view sent, as Chord operations. */
  | { readonly type: "chat.ops"; readonly chatId: number; readonly ops: readonly Op[] }
  | { readonly type: "chat.closed"; readonly chatId: number }
  | CommandResult
  | ProtocolError;

export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

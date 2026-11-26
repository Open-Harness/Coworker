import type { AgentConfig, AgentStamp } from "~/modules/agent-config/types.ts";
import type { Agent } from "~/modules/agent/types.ts";
import type { ChatRow, CommandOutcome, DirectoryCommand, DocumentRow } from "~/modules/protocol/types.ts";
import type { Author } from "~/modules/transcript/types.ts";

/** What a workspace tells the directory about itself. Always the whole picture, so a lost one is repaired by the next. */
export interface Projection {
  readonly workspaceId: string;
  /** Grows with every projection of a workspace; the directory ignores one older than it has. */
  readonly sequence: number;
  readonly chats: readonly ChatRow[];
  readonly documents: readonly DocumentRow[];
}

export interface Registration {
  readonly workspaceId: string;
  readonly name: string;
}

/** The deployed version of an agent that a new chat will run. */
export interface AssignedAgent {
  readonly stamp: AgentStamp;
  readonly config: AgentConfig;
}

/** Chat commands the directory relays, so a workspace stays the only place its chats change. */
export type RelayedCommand =
  | Extract<DirectoryCommand, { readonly type: "chat.update" | "chat.delete" }>
  | (Extract<DirectoryCommand, { readonly type: "chat.create" }> & { readonly agent?: AssignedAgent });

/** The directory as a workspace sees it. */
export interface DirectoryPort {
  publish(projection: Projection): Promise<{ readonly ok: boolean }>;
}

/** A workspace as the directory sees it. Each call is one request to its Durable Object. */
export interface WorkspacePort {
  provision(registration: Registration): Promise<{ readonly ok: boolean }>;
  rename(registration: Registration): Promise<{ readonly ok: boolean }>;
  destroy(workspaceId: string): Promise<{ readonly ok: boolean }>;
  relay(command: RelayedCommand, by: Author): Promise<CommandOutcome>;
}

export type Report = (message: string, error: unknown, details?: Readonly<Record<string, unknown>>) => void;

export interface WorkspaceDependencies {
  readonly agent: Agent;
  readonly directory: DirectoryPort;
  readonly report: Report;
}

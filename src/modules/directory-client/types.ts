import type { Connection, ConnectionOptions, ConnectionStatus } from "~/modules/connection/types.ts";
import type { AgentConfig, AgentRow, DeployedTo } from "~/modules/agent-config/types.ts";
import type { Person } from "~/modules/protocol/types.ts";
import type { CommandError, DirectoryCommand, DirectoryEvent, ModelOption, RowChange, WorkspaceRow } from "~/modules/protocol/types.ts";

export interface DirectoryState {
  readonly status: ConnectionStatus;
  /** Whether a snapshot ever arrived: until then `workspaces` says nothing. */
  readonly loaded: boolean;
  readonly me?: Person;
  readonly models: readonly ModelOption[];
  readonly workspaces: readonly WorkspaceRow[];
  readonly people: readonly Person[];
  readonly agents: readonly AgentRow[];
  /** Whether this visitor may open the admin view. The server checks again. */
  readonly isAdmin: boolean;
}

export interface Source<T> {
  get(): T;
  subscribe(listener: (value: T) => void): { unsubscribe(): void };
}
export type Answer<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: CommandError };

/** The page's copy of everything there is to navigate to, and the commands that change it. */
export interface DirectoryClient {
  readonly state: Source<DirectoryState>;
  createWorkspace(name: string): Promise<Answer<string>>;
  updateWorkspace(workspaceId: string, change: RowChange): Promise<Answer<void>>;
  deleteWorkspace(workspaceId: string): Promise<Answer<void>>;
  /** With a deployed agent, or with the workspace's assistant. */
  createChat(workspaceId: string, agentId?: string): Promise<Answer<number>>;
  updateChat(workspaceId: string, chatId: number, change: RowChange): Promise<Answer<void>>;
  deleteChat(workspaceId: string, chatId: number): Promise<Answer<void>>;
  /** Saves the next version. `basedOn`: the version it started from; absent for a new agent. Returns the agent's id. */
  saveAgent(config: AgentConfig, basedOn?: { readonly id: string; readonly version: number }): Promise<Answer<string>>;
  deployAgent(agentId: string, version: number, to: DeployedTo): Promise<Answer<void>>;
  /** Takes it away from people. Its chats go on. */
  retireAgent(agentId: string): Promise<Answer<void>>;
  deleteAgent(agentId: string): Promise<Answer<void>>;
  readAgent(agentId: string, version: number): Promise<Answer<AgentConfig>>;
  draftAgent(description: string): Promise<Answer<AgentConfig>>;
  close(): void;
}

export interface DirectoryClientDependencies {
  readonly connect: (options: ConnectionOptions<DirectoryCommand, DirectoryEvent>) => Connection<DirectoryCommand>;
  readonly open: ConnectionOptions<DirectoryCommand, DirectoryEvent>["open"];
  readonly onError: (message: string) => void;
}

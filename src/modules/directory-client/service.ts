import { Store } from "@tanstack/store";
import type { Unsent } from "~/modules/connection/types.ts";
import { newId, parseDirectoryEvent } from "~/modules/protocol/service.ts";
import type { CommandOutcome, DirectoryCommand } from "~/modules/protocol/types.ts";
import type { AgentConfig } from "~/modules/agent-config/types.ts";
import { initialState, reduce } from "./internal/reduce.ts";
import type { Answer, DirectoryClient, DirectoryClientDependencies, DirectoryState } from "./types.ts";

type Command = Unsent<DirectoryCommand>;

const done = (outcome: CommandOutcome): Answer<void> => (outcome.ok ? { ok: true, value: undefined } : { ok: false, error: outcome.error });
const unexpected = { ok: false, error: { code: "failed", message: "The server gave an unexpected answer" } } as const;

export function createDirectoryClient({ connect, open, onError }: DirectoryClientDependencies): DirectoryClient {
  const state = new Store<DirectoryState>(initialState);
  const connection = connect({
    open,
    parse: parseDirectoryEvent,
    onEvent: (event) => state.setState((before) => reduce(before, event)),
    onStatus: (status) => state.setState((before) => ({ ...before, status })),
    onError,
  });
  const change = async (command: Command): Promise<Answer<void>> => done(await connection.send(command));
  const ask = async (command: Command): Promise<Answer<AgentConfig>> => {
    const outcome = await connection.send(command, { lasting: false });
    if (!outcome.ok) return { ok: false, error: outcome.error };
    return outcome.output.kind === "agent" ? { ok: true, value: outcome.output.config } : unexpected;
  };
  return {
    state,
    createWorkspace: async (name) => {
      const workspaceId = newId();
      const answer = await change({ type: "workspace.create", workspaceId, name });
      return answer.ok ? { ok: true, value: workspaceId } : answer;
    },
    updateWorkspace: (workspaceId, row) => change({ type: "workspace.update", workspaceId, change: row }),
    deleteWorkspace: (workspaceId) => change({ type: "workspace.delete", workspaceId }),
    createChat: async (workspaceId, agentId) => {
      const outcome = await connection.send({ type: "chat.create", workspaceId, ...(agentId === undefined ? {} : { agentId }) });
      if (!outcome.ok) return { ok: false, error: outcome.error };
      return outcome.output.kind === "chat" ? { ok: true, value: outcome.output.chatId } : unexpected;
    },
    updateChat: (workspaceId, chatId, row) => change({ type: "chat.update", workspaceId, chatId, change: row }),
    deleteChat: (workspaceId, chatId) => change({ type: "chat.delete", workspaceId, chatId }),
    saveAgent: async (config, basedOn = { id: newId(), version: 0 }) => {
      const saved = await change({ type: "agent.save", agentId: basedOn.id, basedOn: basedOn.version, config });
      return saved.ok ? { ok: true, value: basedOn.id } : saved;
    },
    deployAgent: (agentId, version, to) => change({ type: "agent.deploy", agentId, version, to }),
    retireAgent: (agentId) => change({ type: "agent.retire", agentId }),
    deleteAgent: (agentId) => change({ type: "agent.delete", agentId }),
    readAgent: (agentId, version) => ask({ type: "agent.read", agentId, version }),
    draftAgent: (description) => ask({ type: "agent.draft", description }),
    close: () => connection.close(),
  };
}

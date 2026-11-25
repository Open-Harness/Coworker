import type { AgentRow } from "~/modules/agent-config/types.ts";
import type { DirectoryEvent, WorkspaceRow } from "~/modules/protocol/types.ts";
import type { DirectoryState } from "../types.ts";

export const initialState: DirectoryState = {
  status: "connecting",
  loaded: false,
  models: [],
  workspaces: [],
  people: [],
  agents: [],
  isAdmin: false,
};

const order = (left: WorkspaceRow, right: WorkspaceRow): number =>
  Number(right.pinned) - Number(left.pinned) || left.createdAt - right.createdAt || left.id.localeCompare(right.id);

const upsert = (rows: readonly WorkspaceRow[], row: WorkspaceRow): readonly WorkspaceRow[] =>
  [...rows.filter(({ id }) => id !== row.id), row].toSorted(order);

const byAge = (left: AgentRow, right: AgentRow): number => left.createdAt - right.createdAt || left.id.localeCompare(right.id);

export function reduce(state: DirectoryState, event: DirectoryEvent): DirectoryState {
  switch (event.type) {
    case "directory.snapshot": {
      const { me, models, workspaces, people, agents, isAdmin } = event;
      return { ...state, loaded: true, me, models, people, agents, isAdmin, workspaces: workspaces.toSorted(order) };
    }
    case "workspace.changed":
      return { ...state, workspaces: upsert(state.workspaces, event.workspace) };
    case "workspace.removed":
      return { ...state, workspaces: state.workspaces.filter(({ id }) => id !== event.workspaceId) };
    case "people.changed":
      return { ...state, people: event.people };
    case "agent.changed":
      return { ...state, agents: [...state.agents.filter(({ id }) => id !== event.agent.id), event.agent].toSorted(byAge) };
    case "agent.removed":
      return { ...state, agents: state.agents.filter(({ id }) => id !== event.agentId) };
    case "command.result":
    case "error":
      return state;
  }
}

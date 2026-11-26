import type { AgentRow, DeployedTo, ToolGroup } from "~/modules/agent-config/types.ts";
import { TOOL_GROUPS } from "~/modules/agent-config/service.ts";
import type { ModelOption, ModelRef, WorkspaceRow } from "~/modules/protocol/types.ts";

export const modelName = (model: ModelRef | undefined, models: readonly ModelOption[]): string =>
  model === undefined
    ? "Workspace's model"
    : (models.find(({ provider, modelId }) => provider === model.provider && modelId === model.modelId)?.label ??
      `${model.modelId} (not available)`);

export const toolNames = (tools: readonly ToolGroup[]): string =>
  tools.length === 0
    ? "None"
    : TOOL_GROUPS.filter(({ group }) => tools.includes(group))
        .map(({ label }) => label)
        .join(", ");

/** Where an agent is deployed, leaving out workspaces that are gone. */
export function placeNames(to: DeployedTo, workspaces: readonly WorkspaceRow[]): string {
  if (to === "all") return "Every workspace";
  const names = workspaces.filter(({ id }) => to.includes(id)).map(({ name }) => name);
  return names.length === 0 ? "No workspace" : names.join(", ");
}

export const sessionsOf = (agentId: string, workspaces: readonly WorkspaceRow[]): number =>
  workspaces.flatMap(({ chats }) => chats).filter(({ agent }) => agent?.id === agentId).length;

export const isBehind = ({ deployment, version }: AgentRow): boolean => deployment !== undefined && deployment.version < version;

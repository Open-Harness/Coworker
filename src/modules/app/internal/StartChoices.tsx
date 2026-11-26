import { Selector } from "@astryxdesign/core/Selector";
import type { AgentRow } from "~/modules/agent-config/types.ts";
import type { WorkspaceRow } from "~/modules/protocol/types.ts";

const ASSISTANT = "assistant";

/** The agents deployed where a chat is about to start. */
export const agentsIn = (agents: readonly AgentRow[], workspaceId: string | undefined): readonly AgentRow[] =>
  agents.filter(({ deployment }) => {
    if (deployment === undefined) return false;
    return deployment.to === "all" || (workspaceId !== undefined && deployment.to.includes(workspaceId));
  });

interface AgentChoiceProps {
  readonly agents: readonly AgentRow[];
  readonly value: string | undefined;
  readonly onChange: (agentId: string | undefined) => void;
}

/** Who answers: the workspace's assistant, or an agent. */
export function AgentChoice({ agents, value, onChange }: AgentChoiceProps) {
  if (agents.length === 0) return null;
  return (
    <Selector
      label="Agent"
      isLabelHidden
      variant="ghost"
      size="sm"
      options={[
        { value: ASSISTANT, label: "Assistant", description: "The workspace's own" },
        ...agents.map(({ id, config, deployment }) => ({
          value: id,
          label: deployment?.name ?? config.name,
          description: deployment?.description ?? "",
        })),
      ]}
      value={value ?? ASSISTANT}
      onChange={(id) => onChange(id === null || id === ASSISTANT ? undefined : id)}
    />
  );
}

interface WorkspaceChoiceProps {
  readonly workspaces: readonly WorkspaceRow[];
  readonly value: string | undefined;
  readonly onChange: (workspaceId: string) => void;
}

/** Where the chat will be. */
export function WorkspaceChoice({ workspaces, value, onChange }: WorkspaceChoiceProps) {
  if (workspaces.length < 2 || value === undefined) return null;
  return (
    <Selector
      label="Workspace"
      isLabelHidden
      variant="ghost"
      size="sm"
      options={workspaces.map(({ id, name }) => ({ value: id, label: name }))}
      value={value}
      onChange={(id) => id !== null && onChange(id)}
    />
  );
}

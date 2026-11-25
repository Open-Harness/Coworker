import type { AgentConfig } from "~/modules/agent-config/types.ts";

/** A way to begin an agent. */
export interface AgentTemplate {
  readonly key: string;
  readonly config: AgentConfig;
}

export interface AdminShellProps {
  /** The address shown, to mark where one is. */
  readonly path: string;
}
export interface NewAgentScreenProps {
  readonly template?: string;
  /** A config written elsewhere in the admin view. Anything else is ignored. */
  readonly draft?: unknown;
}
export interface AgentScreenProps {
  readonly agentId: string;
}

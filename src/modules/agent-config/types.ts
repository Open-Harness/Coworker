export type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export interface ModelRef {
  readonly provider: string;
  readonly modelId: string;
}

/** What an agent may use. Each is a group of tools. */
export type ToolGroup = "documents" | "web" | "schedule" | "history";
/** Everything that makes an agent. Saved as a whole, as a new version. */
export interface AgentConfig {
  readonly name: string;
  readonly description: string;
  /** Absent: the model of the workspace the agent answers in. */
  readonly model?: ModelRef;
  readonly thinkingLevel: ThinkingLevel;
  readonly system: string;
  readonly tools: readonly ToolGroup[];
  readonly maxTurns: number;
}
export interface AgentStamp {
  readonly id: string;
  readonly name: string;
  readonly version: number;
}
/** `all`: every workspace, also ones created later. */
export type DeployedTo = "all" | readonly string[];
export interface Deployment {
  readonly version: number;
  readonly to: DeployedTo;
  readonly at: number;
  readonly by: string;
  /** The deployed version's own, which the latest version may have changed. */
  readonly name: string;
  readonly description: string;
}
export interface AgentRow {
  readonly id: string;
  /** The latest version. */
  readonly config: AgentConfig;
  readonly version: number;
  /** Newest first. */
  readonly versions: readonly { readonly version: number; readonly savedAt: number; readonly savedBy: string }[];
  readonly createdAt: number;
  readonly createdBy: string;
  /** Absent: people cannot use it yet. */
  readonly deployment?: Deployment;
}

export type Checked = { readonly ok: true; readonly value: AgentConfig } | { readonly ok: false; readonly message: string };
/** Whether something is a whole agent config, and what is wrong with it if not. */
export type CheckAgentConfig = (value: unknown) => Checked;

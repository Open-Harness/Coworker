import type { Context } from "@earendil-works/chord/context";
import type { ConversationId, Harness, HarnessOptions, Tx } from "@earendil-works/pi-durable";
import type { AgentConfig as AssignedConfig } from "~/modules/agent-config/types.ts";
import type { ModelOption, ModelRef, SettingsChange, UsageSummary, WorkspaceSettings } from "~/modules/protocol/types.ts";

export interface AgentConfig {
  /** Provider keys. A provider exists only when its key does. */
  readonly openaiKey?: string | undefined;
  readonly anthropicKey?: string | undefined;
  /** An OpenAI- and Anthropic-compatible proxy such as VibeProxy, and the models to use through it. */
  readonly proxy?: { readonly url: string; readonly models: readonly string[]; readonly key?: string } | undefined;
  /** Adds a scripted model that needs no key, for demos and tests. */
  readonly fakeModel: boolean;
  /** Preferred model, as `provider/model`. Used when its provider is available. */
  readonly defaultModel?: string | undefined;
  readonly fetch: (input: string, init?: RequestInit) => Promise<Response>;
}

export type Draft =
  | { readonly ok: true; readonly config: AssignedConfig }
  | { readonly ok: false; readonly reason: "no_model" | "failed"; readonly message: string };

/** The assistant: its models, tools and prompt, and the settings a workspace may change. */
export interface Agent {
  readonly harnessOptions: HarnessOptions;
  /** Models people can choose, best default first. Empty when no provider has a key. */
  readonly models: readonly ModelOption[];
  readonly defaultModel: ModelRef | undefined;
  settings(harness: Pick<Harness, "snapshot">, context: Context): Promise<WorkspaceSettings>;
  updateSettings(harness: Pick<Harness, "commit">, change: SettingsChange, context: Context): Promise<void>;
  /** Makes a chat answer as this agent from now on. A model that is gone leaves the workspace's. */
  assign(tx: Tx, chatId: ConversationId, config: AssignedConfig): Promise<void>;
  /** Asks the default model for a config that does what someone described. */
  draft(description: string, signal: AbortSignal): Promise<Draft>;
  usage(harness: Pick<Harness, "usage">, context: Context): Promise<UsageSummary>;
}

export type CreateAgent = (config: AgentConfig) => Agent;

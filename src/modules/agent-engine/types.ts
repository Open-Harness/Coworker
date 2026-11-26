import type { ConversationId, Extension, PromptSection, ToolRegistration, Tx } from "@earendil-works/pi-durable";
import type { AgentConfig, BuiltTool, RunAgent } from "~/modules/agents/types.ts";

/**
 * A kind of agent, whole: what it is told and what it can do. Saved agents are data over a kind, so `chosen` and
 * `skills` are what a saved agent switches on. `Deps` is what its tools need, given once by `mount`.
 */
export interface AgentKind<Deps> {
  /** The extension's name. Conversations store it, so it is never renamed. */
  readonly name: string;
  /** What every agent of this kind is told, before anything else. */
  readonly instructions?: string;
  /** Parts of its prompt that are found out each time it is about to answer. */
  readonly sections?: (deps: Deps) => readonly PromptSection[];
  /** Always there. */
  readonly tools: (deps: Deps) => readonly ToolRegistration[];
  /** One per tool a saved agent may switch on; without a saved agent, all of them. A built tool with none here does not compile. */
  readonly chosen?: (deps: Deps) => { readonly [K in BuiltTool]: ToolRegistration };
  /** Reads the files of the agent's skills: there when it has any. */
  readonly skills?: (deps: Deps) => ToolRegistration;
  /** Names of tools this conversation is not offered, whatever its agent: a manager's actions set to off. */
  readonly leaveOut?: (tx: Tx) => Promise<readonly string[]>;
}

export interface Models {
  /** The model for a saved agent's choice; null: the workspace's. */
  readonly modelFor: (choice: AgentConfig["model"]) => { readonly provider: string; readonly modelId: string };
}

/** A kind with what it needs, ready to run. */
export interface Mounted {
  /** Install it in the harness's registry. */
  readonly extension: Extension;
  /** The only place a conversation of this kind is configured: in the commit that makes it, with the saved agent it is. */
  readonly configure: (tx: Tx, conversation: ConversationId, agent: RunAgent | undefined) => Promise<void>;
}

export type Mount = <Deps>(kind: AgentKind<Deps>, deps: Deps, models: Models) => Mounted;

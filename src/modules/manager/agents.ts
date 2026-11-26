import type { RunAgent } from "~/modules/agents/types.ts";
import type { WorkspaceLink } from "./types.ts";

/** What a run takes from a saved agent, and what a manager asks the workspace about its agents and skills. */

export type AgentLookup =
  | { readonly _tag: "Found"; readonly agent: RunAgent }
  /** No agent by that name: deleted, or never made. `names` are the ones there are. */
  | { readonly _tag: "Gone"; readonly name: string; readonly names: readonly string[] }
  | { readonly _tag: "NotProvisioned" };

/** One agent a manager may start, as it reads them: the name and what it is for. */
export interface AgentSummary {
  readonly name: string;
  readonly version: number;
  /** The first line of its instructions. */
  readonly about: string;
  readonly tools: readonly string[];
  readonly skills: readonly string[];
}

export type SkillRead =
  | { readonly _tag: "File"; readonly text: string }
  | { readonly _tag: "NoFile"; readonly paths: readonly string[] }
  | { readonly _tag: "Gone" };

/** What a manager asks of the workspace's saved agents. */
export interface WorkspaceAgents {
  /** The saved agent by this name, as a run starting now would take it. */
  agent(name: string): Promise<AgentLookup>;
  /** The saved agents a manager may start, by name. */
  agents(): Promise<readonly AgentSummary[]>;
  /** A file of a skill (by its id) at the version a run took, which stays readable while that version exists. */
  skillFile(input: { readonly skill: string; readonly version: number; readonly path: string }): Promise<SkillRead>;
}

/** The Workspace object as a manager reaches it. */
export type ManagerWorkspace = WorkspaceLink & WorkspaceAgents;

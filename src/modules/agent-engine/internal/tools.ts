import type { ToolRegistration } from "@earendil-works/pi-durable";
import { type BuiltTool, type RunAgent, TOOLS, type ToolId } from "~/modules/agents/types.ts";
import type { AgentKind } from "../types.ts";

const isBuilt = (id: ToolId): id is BuiltTool => TOOLS[id].built;

export interface KindTools {
  /** Every tool an agent of the kind may have, in the order they are offered. */
  readonly all: readonly ToolRegistration[];
  readonly skill: ToolRegistration | undefined;
  /** The ones this agent has. Without a saved agent: all but the skills' reader, which has nothing to read. */
  readonly has: (agent: RunAgent | undefined) => readonly ToolRegistration[];
}

export function toolsOf<Deps>(kind: AgentKind<Deps>, deps: Deps): KindTools {
  const always = kind.tools(deps);
  const chosen = kind.chosen?.(deps);
  const skill = kind.skills?.(deps);
  const every = chosen === undefined ? [] : Object.values(chosen);
  return {
    all: [...always, ...every, ...(skill === undefined ? [] : [skill])],
    skill,
    has: (agent) => [
      ...always,
      ...(chosen === undefined || agent === undefined ? every : agent.tools.filter(isBuilt).map((id) => chosen[id])),
      ...(skill === undefined || agent === undefined || agent.skills.length === 0 ? [] : [skill]),
    ],
  };
}

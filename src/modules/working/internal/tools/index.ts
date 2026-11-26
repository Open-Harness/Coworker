import { threads } from "~/modules/threads/service.ts";
import type { Mandate } from "~/modules/reach/types.ts";
import type { AgentRole } from "~/modules/playbook/types.ts";
import type { ToolSpec } from "~/modules/completion/types.ts";
import { BOX_TOOLS } from "./box.ts";
import { GITHUB_TOOLS } from "./github.ts";
import { SAID_TOOLS } from "./said.ts";
import { guarded } from "./asked.ts";
import type { Tool } from "../tool.ts";

const ALL: readonly Tool[] = [...BOX_TOOLS, ...SAID_TOOLS, ...GITHUB_TOOLS];
const byName = new Map(ALL.map((tool) => [tool.name, tool]));
const nameOf = (id: string): string => id.replaceAll(".", "_");

export interface Offered {
  readonly specs: readonly ToolSpec[];
  /** The tools a call may name, and no others. */
  readonly may: ReadonlyMap<string, Tool>;
}

/** Exactly what this agent is offered on this work, as the model is told it and as a call is checked. */
export function offered(
  role: "does" | "checks",
  agent: AgentRole,
  mandate: Mandate,
  at: { account: string; place: string } | null,
): Offered {
  const { tools, asks } = threads.offer(role, agent, mandate, at);
  const names = new Set(tools.map(nameOf));
  const asked = new Map(asks.map((id) => [nameOf(id), id]));
  // An action set to ask is offered like any other, and parks at the call until a person says yes.
  const may = new Map<string, Tool>(
    [...byName].flatMap(([name, tool]): [string, Tool][] => {
      const action = asked.get(name);
      return names.has(name) ? [[name, tool]] : action === undefined ? [] : [[name, guarded(tool, action)]];
    }),
  );
  return { specs: [...may.values()].map(({ name, description, parameters }) => ({ name, description, parameters })), may };
}

import type { Mandate, Permission } from "~/modules/reach/types.ts";
import type { AgentRole } from "~/modules/playbook/types.ts";
import type { Offer, Role } from "../types.ts";

type Own = Pick<AgentRole, "tools">;
type At = { readonly account: string; readonly place: string } | null;

const baseTools = new Set(["read", "write", "edit", "bash", "web_read", "web_search", "note", "ask", "done_when", "report", "skill"]);
const checkerTools = new Set(["check", "read", "bash", "skill"]);
const chatTools = ["find", "look", "act", "show_me", "note", "web_read", "web_search", "set_up"];
const rank: Readonly<Record<Permission, number>> = { off: 0, ask: 1, on: 2 };

function unique(list: readonly string[]): readonly string[] {
  return [...new Set(list)];
}

/** The strongest the mandate gives an action at this account and place. A mandate that does not hold gives nothing. */
function given(mandate: Mandate | null, at: At, action: string): Permission {
  if (mandate === null || at === null || mandate.state !== "holds") return "off";
  let found: Permission = "off";
  for (const grant of mandate.grants) {
    if (grant.account !== at.account || (grant.place !== "*" && grant.place !== at.place)) continue;
    const may = grant.may[action] ?? "off";
    if (rank[may] > rank[found]) found = may;
  }
  return found;
}

function doing(agent: Own, mandate: Mandate | null, at: At): Offer {
  const tools: string[] = [];
  const asks: string[] = [];
  for (const tool of unique(agent.tools)) {
    if (baseTools.has(tool)) tools.push(tool);
    else if (tool.includes(".")) {
      const may = given(mandate, at, tool);
      if (may === "on") tools.push(tool);
      if (may === "ask") asks.push(tool);
    }
  }
  return { tools, asks };
}

/** Exactly what this agent may use: never more than its own list, and for connectors never more than the mandate has on or ask. */
export function offer(role: Role, agent: Own, mandate: Mandate | null, at: At): Offer {
  if (role === "judges") return { tools: ["judge"], asks: [] };
  if (role === "speaks") return { tools: chatTools, asks: [] };
  if (role === "checks") return { tools: unique(agent.tools).filter((tool) => checkerTools.has(tool)), asks: [] };
  return doing(agent, mandate, at);
}

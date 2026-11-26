import type { Doing, May, Role, Who } from "../types.ts";
import type { Permission } from "~/modules/reach/types.ts";

const rank = { off: 0, ask: 1, on: 2 } as const;
const roles = { Member: 0, Builder: 1, Owner: 2 } as const;

function least(a: May, b: May): May {
  return rank[a.is] <= rank[b.is] ? a : b;
}

function holds(role: Role, needs: Role): boolean {
  return roles[role] >= roles[needs];
}

function tooSmall(doing: Doing, who: Who): May {
  return { is: "off", why: `Needs ${doing.needs}, and ${who.name} is ${who.role}.` };
}

/** A person: by their role, and less if they set it so, never more. */
function ofPerson(doing: Doing, who: Who): May {
  if (!holds(who.role, doing.needs)) return tooSmall(doing, who);
  const own: Permission = who.own[doing.id] ?? "on";
  if (own === "on") return { is: "on", why: `${who.name} is ${who.role}, which may do this.` };
  return { is: own, why: `${who.name} set this to ${own}.` };
}

/** The co-worker alone: what was set for it, else the registry's; a stop is at most ask; never an ask's answer. */
function ofCoworker(doing: Doing, who: Who): May {
  if (doing.id.startsWith("ask.")) return { is: "off", why: "Only a person answers an ask." };
  if (!holds(who.role, doing.needs)) return tooSmall(doing, who);
  const set = who.own[doing.id];
  const is: Permission = set ?? doing.coworker;
  if (doing.stops && rank[is] > rank.ask) return { is: "ask", why: "It changes something a person decides, so it asks first." };
  return {
    is,
    why: set === undefined ? `The registry says the co-worker's part of this is ${is}.` : `It was set to ${is} for the co-worker.`,
  };
}

export function may(all: readonly Doing[], id: string, who: Who, onBehalfOf?: Who): May {
  const doing = all.find((x) => x.id === id);
  if (!doing) return { is: "off", why: `${id} is not something that can be done.` };
  if (who.is === "person") return ofPerson(doing, who);
  const alone = ofCoworker(doing, who);
  return onBehalfOf ? least(alone, ofPerson(doing, onBehalfOf)) : alone;
}

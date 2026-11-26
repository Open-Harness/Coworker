import { calendar } from "./internal/calendar.ts";
import { checkArgs } from "./internal/checked.ts";
import { crm } from "./internal/crm.ts";
import { email } from "./internal/email.ts";
import { github } from "./internal/github.ts";
import { slack } from "./internal/slack.ts";
import { whatsapp } from "./internal/whatsapp.ts";
import type { ConnectorAction, Connectors } from "./types.ts";

const all: Connectors["all"] = [github, email, slack, whatsapp, crm, calendar];
const byId: ReadonlyMap<string, ConnectorAction> = new Map(all.flatMap((c) => c.actions.map((a) => [a.id, a] as const)));

export const connectors: Connectors = {
  all,
  action: (id) => byId.get(id),
  checked: (id, args) => {
    const action = byId.get(id);
    return action ? checkArgs(action, args) : { _tag: "Wrong", says: `${id} is not an action.` };
  },
  toolName: (id) => id.replace(/\./gu, "_"),
};

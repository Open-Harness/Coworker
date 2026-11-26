import type { Ask } from "~/modules/asks/types.ts";
import type { InboxItem, InboxView } from "~/modules/views-workspace/types.ts";
import type { ConsoleDeps } from "../types.ts";

/* What waits for this person, read from the managers whose work asked. */

/** Every ask addressed to this person, newest first, with the name of the manager that asked. */
async function mineOf(c: ConsoleDeps): Promise<readonly { readonly ask: Ask; readonly manager: string }[]> {
  const [rows, own] = await Promise.all([c.store.managers(), c.store.asks()]);
  const found = await Promise.all(
    rows.map(async (row) => (await c.managers.get(row.objectId, row.region).asks()).map((ask) => ({ ask, manager: row.node.name }))),
  );
  return [...found.flat(), ...own.map((ask) => ({ ask, manager: "Co-worker" }))].filter(({ ask }) => ask.to === c.who.id).toSorted((a, b) => b.ask.at - a.ask.at);
}

function itemOf({ ask, manager }: { readonly ask: Ask; readonly manager: string }): InboxItem {
  const open = ask.state._tag === "Open";
  return {
    ask,
    from: manager,
    preview: ask.question.split("\n")[0] ?? "",
    standing: !open ? "done" : ask.need === "know" ? "know" : "asks",
    proposes: false,
    isNew: open && ask.reminded === 0,
    looked: [],
    otherwise: null,
    links: [],
    beside: {},
  };
}

export async function inboxView(c: ConsoleDeps): Promise<InboxView> {
  return { items: (await mineOf(c)).map(itemOf) };
}

/** How many wait for this person to answer. */
export async function waitingFor(c: ConsoleDeps): Promise<number> {
  return (await mineOf(c)).filter(({ ask }) => ask.state._tag === "Open" && ask.need !== "know").length;
}

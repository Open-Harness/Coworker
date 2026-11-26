import { tree } from "~/modules/tree/service.ts";
import type { Grown, TreeEvent } from "~/modules/tree/types.ts";
import type { ConsoleDeps, ManagerRow } from "../types.ts";
import { accountsOf, wholeOf } from "./around.ts";

export const managerOf = async (c: ConsoleDeps, id: string): Promise<ManagerRow | undefined> =>
  (await c.store.managers()).find(({ node }) => node.id === id);

/** What the tree says to an event, and the rows that changed because of it, kept. Answers why not when it refuses. */
export async function grow(
  c: ConsoleDeps,
  event: TreeEvent,
): Promise<{ readonly grown: Extract<Grown, { _tag: "Grown" }>; readonly rows: readonly ManagerRow[] } | string> {
  const rows = await c.store.managers();
  const grown = tree.grow(
    rows.map(({ node }) => node),
    event,
    wholeOf(await accountsOf(c)),
  );
  if (grown._tag === "Refused") return grown.problems[0]?.says ?? grown.why;
  const changed: ManagerRow[] = [];
  for (const row of rows) {
    const node = grown.nodes.find(({ id }) => id === row.node.id);
    if (node !== undefined && JSON.stringify(node) !== JSON.stringify(row.node)) changed.push({ ...row, node });
  }
  for (const row of changed) await c.store.setManager(row);
  return { grown, rows: changed };
}

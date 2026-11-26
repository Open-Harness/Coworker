import type { ManagerNode, Rolled } from "../types.ts";
import { under } from "./find.ts";

const loudness: Readonly<Record<Rolled["is"], number>> = { paused: 0, idle: 1, working: 2, "needs you": 3, stuck: 4 };

const nothing = (id: string): Rolled => ({ id, came: 0, work: 0, out: 0, open: 0, waiting: 0, cost: 0, is: "idle" });

function add(rows: readonly Rolled[], id: string): Rolled {
  let sum = nothing(id);
  let loudest: Rolled["is"] | null = null;
  for (const row of rows) {
    sum = {
      ...sum,
      came: sum.came + row.came,
      work: sum.work + row.work,
      out: sum.out + row.out,
      open: sum.open + row.open,
      waiting: sum.waiting + row.waiting,
      cost: sum.cost + row.cost,
    };
    if (loudest === null || loudness[row.is] > loudness[loudest]) loudest = row.is;
  }
  return { ...sum, is: loudest ?? "idle" };
}

/** Each manager's row with every row below it added; the loudest of them shows. */
export function roll(nodes: readonly ManagerNode[], own: readonly Rolled[]): readonly Rolled[] {
  return nodes.map((node) => {
    const ids = new Set([node.id, ...under(nodes, node.id).map((below) => below.id)]);
    return add(
      own.filter((row) => ids.has(row.id)),
      node.id,
    );
  });
}

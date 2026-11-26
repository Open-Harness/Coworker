import type { ManagerHead } from "~/modules/views-manager/types.ts";
import type { Tile } from "~/modules/views-workspace/types.ts";
import { at } from "./read.ts";

/* What the manager fixtures share: the story's managers as heads, and small makers. */

export const NOW = at("25 Nov 09:54");
export const HOUR = 3_600_000;
export const MIN = 60_000;

const HEADS: Readonly<Record<string, ManagerHead>> = {
  sales: { id: "sales", name: "Sales", above: "root", is: "working", now: "2 threads, writing to new leads", version: 6 },
  coding: { id: "coding", name: "Coding", above: "root", is: "working", now: "4 threads, newest on ACME-423", version: 7 },
  docs: { id: "docs", name: "Docs", above: "coding", is: "idle", now: "Waiting for the next merge", version: 2 },
  releases: {
    id: "releases",
    name: "Releases",
    above: "coding",
    is: "needs you",
    now: "Asks to cut v2.3 without the 150k fix",
    version: 1,
  },
  support: { id: "support", name: "Support", above: "root", is: "stuck", now: "WhatsApp number offline for 2 hours", version: 4 },
  whatsapp: { id: "whatsapp", name: "WhatsApp desk", above: "support", is: "stuck", now: "Not connected since 08:10", version: 2 },
};
export const head = (id: string): ManagerHead => {
  const found = HEADS[id];
  if (found === undefined) throw new Error(`No manager ${id}`);
  return found;
};

export const tile = (id: string, label: string, value: number | null, unit: Tile["unit"], more: Partial<Tile> = {}): Tile => ({
  id,
  label,
  value,
  unit,
  change: null,
  better: "more",
  points: [],
  ...more,
});

/** What each manager did in the last 7 days, from the story: came, work, out, open, waiting, sent back (share), median hours, cost. */
export const LAST7: Readonly<Record<string, readonly [number, number, number, number, number, number, number, number]>> = {
  sales: [41, 33, 12, 21, 1, 0.08, 26, 52],
  coding: [86, 24, 19, 8, 2, 0.11, 9, 148],
  docs: [19, 8, 8, 0, 0, 0, 1, 12],
  releases: [11, 3, 1, 2, 1, 0, 20, 9],
  support: [212, 131, 118, 27, 5, 0.17, 3, 96],
  whatsapp: [94, 52, 44, 14, 3, 0.2, 4, 38],
};

/** The six numbers a manager is read by when it has no objective to show yet. */
export function sixTiles(id: string, notYet: readonly string[] = []): readonly Tile[] {
  const [came, work, , , waiting, back, median, cost] = LAST7[id] ?? [0, 0, 0, 0, 0, 0, 0, 0];
  return [
    tile("came", "Came in", came, "count"),
    tile("work", "Became work", work, "count"),
    tile("sent-back", "Sent back", notYet.includes("sent-back") ? null : back, "share", { better: "less" }),
    tile("median", "Median time", median, "hours", { better: "less" }),
    tile("waiting", "Waiting on people", waiting, "count", { better: "less" }),
    tile("cost", "What it cost", cost, "dollars", { better: "less" }),
  ];
}

import type { Part } from "~/modules/coworker/types.ts";
import type { ConsoleDeps } from "../types.ts";
import { PARTS } from "./do-spending.ts";

const DAY = 86_400_000;

/** What each manager may spend of the day, and what it used of it on an average day of the last seven. */
export async function spendingParts(c: ConsoleDeps): Promise<readonly Part[]> {
  const saved = await c.store.setting(PARTS);
  if (typeof saved !== "object" || saved === null) return [];
  const rows = await c.store.managers();
  const since = c.clock.now() - 7 * DAY;
  return Promise.all(
    Object.entries(saved as Record<string, number>).map(async ([manager, part]) => {
      const row = rows.find(({ node }) => node.id === manager);
      const usage = row === undefined ? [] : await c.managers.get(row.objectId, row.region).usage();
      const used = usage.filter(({ day }) => day >= since).reduce((sum, { dollars }) => sum + dollars, 0) / 7;
      return { manager, part, used, perWork: row?.node.reach.limits.perWork ?? null };
    }),
  );
}

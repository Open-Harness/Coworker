import type { Spend } from "~/modules/working/types.ts";
import type { UsageRow } from "../types.ts";

const DAY = 86_400_000;

/** What the calls cost, a day and a model at a time. A call whose price was not known is counted in `notKnown`, and adds nothing to the dollars. */
export function usageOf(spends: readonly Spend[]): readonly UsageRow[] {
  const rows = new Map<string, UsageRow>();
  for (const spend of spends) {
    const day = Math.floor(spend.at / DAY) * DAY;
    const key = `${day}|${spend.connection}|${spend.model}`;
    const was = rows.get(key) ?? { day, connection: spend.connection, model: spend.model, dollars: 0, notKnown: 0 };
    rows.set(key, { ...was, dollars: was.dollars + (spend.dollars ?? 0), notKnown: was.notKnown + (spend.dollars === undefined ? 1 : 0) });
  }
  return [...rows.values()];
}

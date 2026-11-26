import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import { dayMonth, say } from "../manager-frame/words.ts";

export type Measure = ManagerOverview["measures"][number];

/** A tile's number as the page says it: `9`, `$5.80`, `1 of 96`, or nothing yet. */
export const valueOf = (measure: Measure): string => {
  const { tile } = measure;
  if (tile.value === null) return "Not yet";
  return tile.unit === "of" ? `${say("count", tile.value)} of ${tile.of ?? ""}` : say(tile.unit, tile.value);
};

/** What it was before the manager: a number, or a person's word for it. */
export const beforeOf = (measure: Measure): string => {
  const { before, per, tile } = measure;
  if (before.value === null) return before.note ?? "Unknown";
  const said = say(tile.unit, before.value);
  const rate = per !== null && !tile.label.includes(`a ${per}`) ? `${said} a ${per}` : said;
  return before.note === null ? rate : `${rate}, ${before.note}`;
};

/** What it should be: "12 by 31 Dec", "Under 1 h", or a person's word for it. */
export const aimOf = (measure: Measure, zone: string): string => {
  const { aim, per, tile } = measure;
  if (aim.value === null) return aim.note ?? "";
  const said = say(tile.unit, aim.value, true);
  if (aim.limit === "under") return `Under ${said}${aim.note === null ? "" : ` ${aim.note}`}`;
  if (aim.by !== null) return `${said} by ${dayMonth(aim.by, zone)}`;
  return per !== null && !tile.label.includes(`a ${per}`) ? `${said} a ${per}` : said;
};

/** Where it is read, and when the number comes if it has not yet. */
export const readOf = (measure: Measure): string =>
  measure.notYet === null ? measure.read : `${measure.read}${measure.notYet.why.startsWith("from") ? ", " : ". "}${measure.notYet.why}`;

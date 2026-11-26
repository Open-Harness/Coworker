import type { Eval, Measure } from "~/modules/playbook/types.ts";
import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import { money } from "./words.ts";

/* How a number of the playbook is said: what it is now, and what it must stay under. */

type Row = ManagerOverview["measures"][number];

const hours = (h: number): string => (h < 1 ? `${Math.round(h * 60)} min` : `${Math.round(h * 10) / 10} h`);
/** What a tile says it is now: "9", "3 min", "$5.80", "1 of 96". */
export function valueWords(tile: Row["tile"]): string {
  if (tile.value === null) return "Not yet";
  if (tile.unit === "dollars") return money(tile.value);
  if (tile.unit === "hours") return hours(tile.value);
  if (tile.unit === "share") return `${Math.round(tile.value * 100)}%`;
  if (tile.unit === "of") return `${tile.value} of ${tile.of ?? 0}`;
  return String(tile.value);
}
/** What it aims at: "Under 10 min", "Under 3 in 100", "Under $15". */
export function aimWords(row: Row): string {
  const { value, limit, note } = row.aim;
  if (value === null) return note ?? "";
  const amount = row.tile.unit === "dollars" ? money(value) : row.tile.unit === "hours" ? hours(value) : String(value);
  const said = note === null ? amount : `${amount} ${note}`;
  return limit === "under" ? `Under ${said}` : limit === "at least" ? `At least ${said}` : said;
}

/** The same for a measure that is only in the playbook: its unit says what it is counted in. */
export function limitWords(measure: Measure, limit: number): string {
  const unit = measure.unit.split(" per ")[0] ?? measure.unit;
  const amount = unit === "dollars" ? money(limit) : unit === "minutes" ? `${limit} min` : `${limit} ${unit}`;
  return `${measure.better === "less" ? "Under" : "At least"} ${amount}`;
}

/** An eval's number: `79` of unit "percent" is "79%", `10` of "of 11" is "10 of 11", `31` of "points" is "+31". */
export function evalWords(value: number, unit: Eval["line"]["unit"]): string {
  if (unit === "percent") return `${value}%`;
  if (unit === "points") return `+${value}`;
  if (unit.startsWith("of ")) return `${value} ${unit}`;
  return String(value);
}

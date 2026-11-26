import type { Did } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Handler } from "./handlers.ts";
import { settingOr } from "./settings-kept.ts";

const refuse = (why: string): Did => ({ _tag: "Refused", why });

/** What a day's money is cut into: a part for each manager, as it was written, or as it was sent. */
export const PARTS = "spending.parts";

/** The parts as they come: a record of numbers, or the same written as JSON. */
function partsOf(value: unknown): Readonly<Record<string, number>> | string {
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return "The parts are not written as {manager: dollars}.";
    }
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return "The parts are not written as {manager: dollars}.";
  const parts: Record<string, number> = {};
  for (const [manager, dollars] of Object.entries(raw)) {
    const amount = typeof dollars === "string" ? Number(dollars) : dollars;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return `${manager}'s part is not an amount of dollars.`;
    parts[manager] = amount;
  }
  return parts;
}

/** The day's money in parts: each manager's, never more together than the day's. */
const save: Handler = async (c, values) => {
  const parts = partsOf(values["parts"]);
  if (typeof parts === "string") return refuse(parts);
  const known = new Set((await c.store.managers()).map(({ node }) => node.id));
  const stranger = Object.keys(parts).find((manager) => !known.has(manager));
  if (stranger !== undefined) return refuse(`There is no manager "${stranger}" to give a part.`);
  const whole = await settingOr(c.store, "perDay", 100);
  const total = Object.values(parts).reduce((sum, dollars) => sum + dollars, 0);
  if (total > whole)
    return refuse(`The parts add up to ${total} dollars, and a day has ${whole}. The parts never add up to more than the day.`);
  await c.store.set(PARTS, parts);
  return { _tag: "Done", id: null, says: doings.sentence("spending.save", {}, c.who.name), link: null };
};

export const spendingHandlers: Readonly<Record<string, Handler>> = { "spending.save": save };

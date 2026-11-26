import type { AskRule } from "~/modules/playbook/types.ts";
import type { Actor, Gated, Item } from "../types.ts";

/** The rule of the item's place: an exact place beats `*`. */
export function ruleFor(item: Pick<Item, "account" | "place">, rules: readonly AskRule[]): AskRule | undefined {
  const here = rules.filter((r) => r.account === item.account);
  return here.find((r) => r.place === item.place) ?? here.find((r) => r.place === "*");
}

export function who(actor: Actor): string {
  return actor.name === actor.address ? actor.address : `${actor.name} (${actor.address})`;
}

function isListed(rule: AskRule, actor: Actor): boolean {
  const listed = rule.listed.who;
  if (listed === "team") return actor.person !== undefined || actor.standing === "inside";
  if (listed === "writers") return actor.standing === "write" || actor.standing === "admin";
  return listed.includes(actor.address) || (actor.person !== undefined && listed.includes(actor.person));
}

/** Whose words count as asking: code, never a model. Names and what the words say grant nothing. */
export function gate(item: Item, rules: readonly AskRule[]): Gated {
  const actor = who(item.actor);
  const rule = ruleFor(item, rules);
  if (rule === undefined)
    return { let: "no", why: `No rule says who may ask in ${item.place} of ${item.account}, so nobody may; ${actor} did not.` };
  if (item.by === "cron" || item.by === "wait")
    return {
      let: "maybe",
      why: `It was found by ${item.by === "cron" ? "a schedule" : "a wait"}, not asked by ${actor}, so it is for the judge.`,
    };
  if (item.actor.bot && !rule.bots.includes(item.actor.address))
    return { let: "no", why: `${actor} is a bot that the rule for ${item.place} does not list, so it does not count.` };
  if (!item.addressed)
    return {
      let: rule.overheard,
      why: `${actor} did not speak to the co-worker, so the rule's overheard setting (${rule.overheard}) applies.`,
    };
  if (item.actor.bot || isListed(rule, item.actor)) return { let: "asked", why: `${actor} is listed as one who may ask in ${item.place}.` };
  return { let: rule.others, why: `${actor} is not listed in ${item.place}, so the rule's setting for others (${rule.others}) applies.` };
}

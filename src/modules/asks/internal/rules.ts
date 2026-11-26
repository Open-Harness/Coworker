import type { Asks, Rule } from "../types.ts";

type Use = Parameters<Asks["covers"]>[1];

export function coversUse(rule: Rule, use: Use): boolean {
  if (rule.state !== "on" || rule.action !== use.action) return false;
  if ("thread" in rule.when) return rule.when.thread === use.thread;
  if ("person" in rule.when) return rule.when.person === use.person;
  return rule.when.kind === use.kind;
}

export function afterUseOf(rule: Rule, right: boolean, lastWasRight: boolean): Rule {
  const counted = right ? { ...rule, right: rule.right + 1 } : { ...rule, wrong: rule.wrong + 1 };
  if (!right && !lastWasRight && rule.state === "on") return { ...counted, state: "back to ask" };
  return counted;
}

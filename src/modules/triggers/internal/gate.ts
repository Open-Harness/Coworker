import type { Actor, Gated, HandleRef, Policy, Trigger } from "../types.ts";

const same = (handle: HandleRef, actor: Actor): boolean =>
  handle.kind === actor.kind && (handle.space ?? "") === (actor.space ?? "") && handle.id.toLowerCase() === actor.id.toLowerCase();

const domainOf = (address: string): string => address.slice(address.lastIndexOf("@") + 1).toLowerCase();

/** On the list, and the platform vouches it is them. A forged From is nobody. */
export function isAllowed(actor: Actor, policy: Policy, person?: string): boolean {
  if (!actor.verified) return false;
  return policy.allowed.some((allow) => {
    if (allow.kind === "person") return person !== undefined && allow.person === person;
    return allow.kind === "handle"
      ? same(allow.handle, actor)
      : actor.kind === "email" && domainOf(actor.id) === allow.domain.toLowerCase();
  });
}

const inferred = (policy: Policy): Gated =>
  policy.acceptMode === "off"
    ? { _tag: "Ignored", reason: "Accept mode is off for work nobody asked for" }
    : { _tag: "Candidate", strength: "inferred" };

/** model.md's table, top to bottom. Follow-ups never get here. */
export function gate(trigger: Trigger, policy: Policy, person?: string): Gated {
  const { actor } = trigger;
  if (!actor.human) {
    return policy.bots.some((bot) => same(bot, actor)) ? inferred(policy) : { _tag: "Ignored", reason: "A bot not on the bot list" };
  }
  if (isAllowed(actor, policy, person))
    return trigger.addressed === undefined ? inferred(policy) : { _tag: "Candidate", strength: "explicit" };
  const row = policy.admission[trigger.scope] ?? "ignore";
  if (row === "explicit") return { _tag: "Candidate", strength: "explicit" };
  if (row === "inferred") return inferred(policy);
  return { _tag: "Ignored", reason: actor.verified ? "The sender is not on the allowed list" : "The sender could not be verified" };
}

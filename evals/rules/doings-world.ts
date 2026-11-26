import { expect } from "vitest";
import { doings } from "~/modules/doings/service.ts";
import type { Doing, Role, Who } from "~/modules/doings/types.ts";
import type { Permission } from "~/modules/reach/types.ts";

export const rank = { off: 0, ask: 1, on: 2 } as const;
export const roles = { Member: 0, Builder: 1, Owner: 2 } as const;
export const least = (a: Permission, b: Permission): Permission => (rank[a] <= rank[b] ? a : b);
export const person = (role: Role, own: Readonly<Record<string, Permission>> = {}, id = role.toLowerCase()): Who => ({
  id,
  name: id,
  is: "person",
  role,
  own,
});
export const juno = (own: Readonly<Record<string, Permission>> = {}): Who => ({
  id: "juno",
  name: "Juno",
  is: "coworker",
  role: "Owner",
  own,
});
export const registry = (id: string): Doing => {
  const found = doings.all.find((d) => d.id === id);
  if (!found) throw new Error(`no doing ${id}`);
  return found;
};
export const plain = (text: string) => {
  expect(text.trim().length).toBeGreaterThan(3);
  expect(text).not.toMatch(/\b(blocked|pending)\b/iu);
};
export const slots = (sentence: string) => [...sentence.matchAll(/\{([^{}]+)\}/gu)].map((m) => m[1] ?? "");
/** What the registry says a person may do: their role, and what they set for themselves, which can only be less. */
export const forPerson = (spec: { id: string; needs: Role }, who: Who): Permission => {
  const byRole: Permission = roles[who.role] >= roles[spec.needs] ? "on" : "off";
  return least(byRole, who.own[spec.id] ?? "on");
};
export const askId = (id: string) => id.startsWith("ask.");
/** What the co-worker may do alone: what was set for it, else the registry's; never more than a stop allows, and never an ask's answer. */
export const forJuno = (spec: { id: string; needs: Role; coworker: Permission; stops: boolean }, who: Who): Permission => {
  let is = who.own[spec.id] ?? spec.coworker;
  if (spec.stops) is = least(is, "ask");
  if (askId(spec.id)) is = "off";
  return roles[who.role] >= roles[spec.needs] ? is : "off";
};

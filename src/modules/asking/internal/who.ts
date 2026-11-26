import type { Ask } from "~/modules/asks/types.ts";

/** Who has stood in for the one asked, so far: one more each time a reminder was not answered. */
export const standIns = (ask: Ask): readonly string[] => ask.then.slice(0, Math.max(ask.reminded - 1, 0));

/** Whose it is to answer: the one asked, whoever stands in, and an Owner. */
export const mayAnswer = (ask: Ask, person: { readonly id: string; readonly role: string }): boolean =>
  ask.to === person.id || standIns(ask).includes(person.id) || person.role === "Owner";

/** Whose inbox it is in. */
export const isFor = (ask: Ask, person: string): boolean => ask.to === person || standIns(ask).includes(person);

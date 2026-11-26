import type { Ask, Asked, NewAsk } from "../types.ts";

function refuse(why: string): Asked {
  return { _tag: "Refused", why };
}

/** Why an ask cannot be made, or null when it can. */
export function whyNot(input: NewAsk, at: number): string | null {
  if (input.to.trim() === "") return "An ask is to one person, and it names no one.";
  if (input.need === "approve" && input.shows === null) return "An approval shows what will be sent or done, and this shows nothing.";
  if (input.need !== "know" && (input.by === null || input.by <= at))
    return "An ask that waits for someone has a date that is still to come.";
  if (input.best !== null && !input.options.some((o) => o.id === input.best))
    return `The best answer "${input.best}" is not one of the options.`;
  return whyElse(input);
}

function whyElse(input: NewAsk): string | null {
  if (input.else === "wait") return null;
  const option = input.else.option;
  if (input.need !== "decide") return "Only a decision may say what happens without an answer.";
  if (input.shows !== null) return "What happens without an answer cannot send or do anything outside.";
  if (!input.options.some((o) => o.id === option))
    return `What happens without an answer is "${option}", and that is not one of the options.`;
  return null;
}

export function makeAsk(input: NewAsk, at: number): Asked {
  const why = whyNot(input, at);
  if (why !== null) return refuse(why);
  const ask: Ask = { ...input, at, reminded: 0, state: { _tag: "Open" } };
  return { _tag: "Asked", ask };
}

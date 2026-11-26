import type { Answered, Ask, Reply } from "../types.ts";

export function answerAsk(ask: Ask, reply: Reply): Answered {
  if (!reply.may) return { _tag: "Refused", why: `${reply.by} may not answer this.` };
  if (ask.state._tag === "Gone") return { _tag: "Refused", why: `This is no longer asked: ${ask.state.why}` };
  if (ask.state._tag === "Answered") {
    const first = ask.state;
    return { _tag: "Late", ask, says: `${first.by} answered first, on ${first.where}: ${first.answer}.` };
  }
  if (reply.answer.trim() === "") return { _tag: "Refused", why: "An answer has to say something." };
  if (ask.options.length > 0 && !ask.options.some((o) => o.id === reply.answer))
    return { _tag: "Refused", why: `"${reply.answer}" is not one of the answers: ${ask.options.map((o) => o.id).join(", ")}.` };
  const state = { _tag: "Answered", by: reply.by, answer: reply.answer, where: reply.where, at: reply.at } as const;
  return { _tag: "Answered", ask: { ...ask, state } };
}

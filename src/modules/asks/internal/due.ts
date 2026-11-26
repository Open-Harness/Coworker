import type { Ask, Due } from "../types.ts";

const NOTHING: Due = { _tag: "Nothing" };

export function dueAsk(ask: Ask, now: number): Due {
  if (ask.state._tag !== "Open" || ask.by === null || now < ask.by) return NOTHING;
  if (ask.reminded === 0) return { _tag: "Remind", person: ask.to };
  const stand = ask.then[ask.reminded - 1];
  if (stand !== undefined) return { _tag: "StandIn", person: stand };
  if (ask.reminded === ask.then.length + 1 && ask.else !== "wait") return { _tag: "Else", option: ask.else.option };
  return NOTHING;
}

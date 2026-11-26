import { asks } from "~/modules/asks/service.ts";
import type { AskingDeps, Kept } from "../types.ts";
import { answerOnce, settle } from "./answer.ts";

const DAY = 86_400_000;
const AGAIN = 60_000;

/** What silence does for one ask, once now: a reminder, then each stand-in, then what it says without an answer. */
async function due(c: AskingDeps, kept: Kept, now: number): Promise<void> {
  const next = asks.due(kept.ask, now);
  if (next._tag === "Nothing") return;
  if (next._tag === "Else") {
    await answerOnce(c, kept, { by: "nobody", answer: next.option, where: "silence", may: true });
    return;
  }
  c.store.put({ ...kept, ask: { ...kept.ask, reminded: kept.ask.reminded + 1 } });
}

/** When the next thing is due, for what is open: its date, or a day on when it has more steps still. */
function nextOf(open: readonly Kept[], now: number): number | null {
  const dates = open.flatMap(({ ask }) => {
    if (ask.by === null || asks.due(ask, Number.MAX_SAFE_INTEGER)._tag === "Nothing") return [];
    return [ask.by <= now ? now + DAY : ask.by];
  });
  return dates.length === 0 ? null : Math.min(...dates);
}

/** A wake-up does each step once: so after any number of days, an ask has been reminded once. */
export async function tick(c: AskingDeps): Promise<number | null> {
  const now = c.clock.now();
  for (const kept of c.store.open()) await due(c, kept, now);
  for (const kept of c.store.untold()) {
    if (kept.ask.state._tag === "Answered") await settle(c, kept, { _tag: "Answered", ask: kept.ask });
  }
  const lost = c.store.untold().length > 0 ? now + AGAIN : null;
  const next = nextOf(c.store.open(), now);
  return lost === null ? next : Math.min(lost, next ?? lost);
}

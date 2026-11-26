import type { TriggerDecision } from "~/modules/manager/types.ts";
import type { EventEntry } from "~/modules/workspace/types.ts";
import type { EventsByOutcome, ManagerFacts } from "../types.ts";
import { perDay } from "./days.ts";

type Outcome = keyof EventsByOutcome;

/** What became of one heard line: the Workspace wrote `… → follow-up on DT-1`, `… → ignored: …` or `… → explicit candidate`. */
export function outcomeOf(event: EventEntry, decision: TriggerDecision | undefined): Outcome | undefined {
  const arrow = event.line.lastIndexOf(" → ");
  if (arrow < 0) return undefined;
  const result = event.line.slice(arrow + 3);
  if (result.startsWith("follow-up on ")) return "followup";
  if (/^(?:ignored|dropped):/u.test(result)) return "ignored";
  if (!result.endsWith(" candidate")) return undefined;
  if (decision === undefined) return "waiting";
  return decision.kind === "ignore" ? "ignored" : "accepted";
}

export function eventsByOutcome(days: readonly string[], managers: readonly ManagerFacts[]): EventsByOutcome {
  const moments: Record<Outcome, number[]> = { accepted: [], followup: [], ignored: [], waiting: [] };
  for (const { events, decisions } of managers) {
    const decided = new Map(decisions.map((decision) => [decision.trigger, decision]));
    for (const event of events) {
      const outcome = outcomeOf(event, event.trigger === undefined ? undefined : decided.get(event.trigger));
      if (outcome !== undefined) moments[outcome].push(event.at);
    }
  }
  return {
    accepted: perDay(days, moments.accepted),
    followup: perDay(days, moments.followup),
    ignored: perDay(days, moments.ignored),
    waiting: perDay(days, moments.waiting),
  };
}

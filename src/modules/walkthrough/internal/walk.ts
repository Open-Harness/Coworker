import type { WalkEvent, Walked, Walkthrough } from "../types.ts";
import { answerConnect, wrong } from "./connect.ts";
import { drafted, edited, judged, make, throwAway } from "./draft.ts";
import { answers, asks, couldCarry, found, measured, wants } from "./early.ts";
import { isEnded, refuse } from "./result.ts";

function step(walk: Walkthrough, event: WalkEvent): Walked {
  switch (event.is) {
    case "measured":
      return measured(walk, event);
    case "could carry":
      return couldCarry(walk);
    case "asks":
      return asks(walk, event);
    case "answers":
      return answers(walk, event);
    case "wants":
      return wants(walk, event);
    case "connected":
    case "skipped":
      return answerConnect(walk, event);
    case "found":
      return found(walk, event);
    case "that is wrong":
      return wrong(walk, event);
    case "drafted":
      return drafted(walk, event);
    case "edited":
      return edited(walk, event);
    case "judged":
      return judged(walk, event);
    case "make it":
      return make(walk);
    case "throw away":
      return throwAway(walk);
  }
}

/** One event, in order. When it has ended nothing more happens. */
export function walk(walkthrough: Walkthrough, event: WalkEvent): Walked {
  if (isEnded(walkthrough)) return refuse("This one has ended, so nothing more can happen in it.");
  return step(walkthrough, event);
}

import { Blueprint } from "orthograph";
import { Trial } from "./thing.ts";
import * as Events from "./events.ts";

// Running on past work, then tried; a person keeps the version there is, or uses the change as the next one. `tried` is
// the loop's move when the cases are scored (delta D5).
export const machine = Blueprint.machine(Trial, {
  states: ["running", "tried", "kept", "used"],
  moves: {
    try: { from: [], to: "running", emits: Events.TrialStarted },
    tried: { from: ["running"], to: "tried", emits: Events.TrialTried },
    decide: { from: ["tried"], to: ["kept", "used"], emits: Events.TrialDecided },
  },
  notFrom: { exit: 59 },
});

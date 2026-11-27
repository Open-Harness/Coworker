import { Blueprint } from "orthograph";
import { Call } from "./thing.ts";
import * as Events from "./events.ts";

// A call that needs a yes starts asked; one that is on starts running. No person presses any of these: the answer to its
// ask moves it (delta D8), and the loop finishes it (delta D5).
export const machine = Blueprint.machine(Call, {
  states: ["asked", "running", "done", "refused", "failed"],
  moves: {
    make: { from: [], to: ["asked", "running"], emits: Events.CallMade },
    approve: { from: ["asked"], to: "running", emits: Events.CallApproved },
    refuse: { from: ["asked"], to: "refused", emits: Events.CallRefused },
    end: { from: ["running"], to: ["done", "failed"], emits: Events.CallEnded },
  },
  notFrom: { exit: 80 },
});

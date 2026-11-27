import { Blueprint } from "orthograph";
import { Thread } from "./thing.ts";
import * as Events from "./events.ts";

// Working, waiting, then ended: it reported (done, no or stuck, in `report`), its wait went unanswered, it was stopped, or
// it went over its limit (spec H4). Every move but `stop` is the loop's (delta D5); a wait is a parked tool (delta D7).
export const machine = Blueprint.machine(Thread, {
  states: ["working", "waiting", "reported", "unanswered", "stopped", "over"],
  moves: {
    start: { from: [], to: "working", emits: Events.ThreadStarted },
    wait: { from: ["working"], to: "waiting", emits: Events.ThreadWaits },
    wake: { from: ["waiting"], to: "working", emits: Events.ThreadWoke },
    report: { from: ["working"], to: "reported", emits: Events.ThreadReported },
    unanswered: { from: ["waiting"], to: "unanswered", emits: Events.ThreadUnanswered },
    stop: { from: ["working", "waiting"], to: "stopped", emits: Events.ThreadStopped },
    over: { from: ["working"], to: "over", emits: Events.ThreadOver },
  },
  notFrom: { exit: 70 },
});

import { Blueprint } from "orthograph";
import { Work } from "./thing.ts";
import * as Events from "./events.ts";

const ended = ["done", "no", "dropped", "stopped", "handedOver"] as const;

// Its lifecycle only; its step is data (inventory, question 1). `wait`, `wake` and `finish` are the loop's moves, which no
// person presses (delta D5). Only a person opens it again: `work.open_again` is off for the co-worker (delta D4).
export const machine = Blueprint.machine(Work, {
  states: ["open", "waiting", ...ended],
  moves: {
    add: { from: [], to: "open", emits: Events.WorkAdded },
    wait: { from: ["open"], to: "waiting", emits: Events.WorkWaits },
    wake: { from: ["waiting"], to: "open", emits: Events.WorkWoke },
    finish: { from: ["open"], to: ["done", "no", "dropped"], emits: Events.WorkEnded },
    stop: { from: ["open", "waiting"], to: "stopped", emits: Events.WorkStopped },
    handOver: { from: ["open", "waiting"], to: "handedOver", emits: Events.WorkHandedOver },
    openAgain: { from: [...ended], to: "open", emits: Events.WorkOpenedAgain },
  },
  notFrom: { exit: 60 },
});

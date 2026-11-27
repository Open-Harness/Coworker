import { Blueprint } from "orthograph";
import { Manager } from "./thing.ts";
import * as Events from "./events.ts";

// Paused is set by a person; working, needs you, idle and stuck are worked out (inventory, The nouns). Retiring hands its
// open work to another manager.
export const machine = Blueprint.machine(Manager, {
  states: ["working", "paused", "retired"],
  moves: {
    make: { from: [], to: "working", emits: Events.ManagerMade },
    pause: { from: ["working"], to: "paused", emits: Events.ManagerPaused },
    start: { from: ["paused"], to: "working", emits: Events.ManagerStarted },
    retire: { from: ["working", "paused"], to: "retired", emits: Events.ManagerRetired },
  },
  notFrom: { exit: 40 },
});

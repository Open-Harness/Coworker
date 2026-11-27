import { Blueprint } from "orthograph";
import { Join } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Join, {
  states: ["asked", "letIn", "refused"],
  moves: {
    ask: { from: [], to: "asked", emits: Events.JoinAsked },
    letIn: { from: ["asked"], to: "letIn", emits: Events.JoinLetIn },
    refuse: { from: ["asked"], to: "refused", emits: Events.JoinRefused },
  },
  notFrom: { exit: 28 },
});

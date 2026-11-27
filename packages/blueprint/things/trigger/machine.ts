import { Blueprint } from "orthograph";
import { Trigger } from "./thing.ts";
import * as Events from "./events.ts";

// On or off. The switch on the Triggers page presses only `trigger.off`; no registered doing turns one back on, so `on`
// has no operation yet (inventory, Gaps).
export const machine = Blueprint.machine(Trigger, {
  states: ["on", "off"],
  moves: {
    add: { from: [], to: "on", emits: Events.TriggerAdded },
    off: { from: ["on"], to: "off", emits: Events.TriggerOff },
    on: { from: ["off"], to: "on", emits: Events.TriggerOn },
  },
  notFrom: { exit: 55 },
});

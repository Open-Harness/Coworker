import { Blueprint } from "orthograph";
import { Item } from "./thing.ts";
import * as Events from "./events.ts";

// Kept once, then intake took it, joined it to work there is, asked first, left it (saying what it would have done),
// stopped, or could not tell (`intake/came.ts:37`). `come` and `decide` are the loop's moves (delta D5); a person answers
// an item that asked. A correction says right or wrong and moves nothing.
export const machine = Blueprint.machine(Item, {
  states: ["kept", "took", "joined", "asked", "left", "stopped", "couldNot"],
  moves: {
    come: { from: [], to: "kept", emits: Events.ItemCame },
    decide: { from: ["kept"], to: ["took", "joined", "asked", "left", "stopped", "couldNot"], emits: Events.ItemDecided },
    approve: { from: ["asked"], to: ["took", "left"], emits: Events.ItemApproved },
  },
  notFrom: { exit: 57 },
});

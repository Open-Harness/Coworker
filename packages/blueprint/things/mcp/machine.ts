import { Blueprint } from "orthograph";
import { Mcp } from "./thing.ts";
import * as Events from "./events.ts";

// Adding it tries it at once: it works or it failed. A check tries again; removing it is for good.
export const machine = Blueprint.machine(Mcp, {
  states: ["works", "failed", "removed"],
  moves: {
    add: { from: [], to: ["works", "failed"], emits: Events.McpAdded },
    check: { from: ["works", "failed"], to: ["works", "failed"], emits: Events.McpChecked },
    remove: { from: ["works", "failed"], to: "removed", emits: Events.McpRemoved },
  },
  notFrom: { exit: 88 },
});

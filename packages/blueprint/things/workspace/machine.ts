import { Blueprint } from "orthograph";
import { Workspace } from "./thing.ts";
import * as Events from "./events.ts";

// Deleted by an Owner who types its name; gone 30 days later, and it can be taken back until then (spec L4).
export const machine = Blueprint.machine(Workspace, {
  states: ["open", "deleting"],
  moves: {
    make: { from: [], to: "open", emits: Events.WorkspaceMade },
    delete: { from: ["open"], to: "deleting", emits: Events.WorkspaceDeleting },
    takeBack: { from: ["deleting"], to: "open", emits: Events.WorkspaceTakenBack },
  },
  notFrom: { exit: 20 },
});

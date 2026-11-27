import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `manager.pause`, on the manager's settings page.
export default Blueprint.operation(Manager, {
  description: "Pause a manager: it takes nothing new and its threads stop at their next step.",
  payload: { workspace: Manager.fields.workspace, manager: Manager.fields.id },
  answer: {},
  move: machine.moves.pause,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

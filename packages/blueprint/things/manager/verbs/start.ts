import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `manager.start`, on the manager's settings page.
export default Blueprint.operation(Manager, {
  description: "Start a paused manager again.",
  payload: { workspace: Manager.fields.workspace, manager: Manager.fields.id },
  answer: {},
  move: machine.moves.start,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

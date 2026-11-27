import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { HandToWrong } from "../errors.ts";

// Doing `manager.retire`, on the manager's settings page. Its open work goes to `handTo`.
export default Blueprint.operation(Manager, {
  description: "Retire a manager, handing its open work to another.",
  payload: { workspace: Manager.fields.workspace, manager: Manager.fields.id, handTo: Manager.fields.above },
  answer: {},
  move: machine.moves.retire,
  errors: [HandToWrong],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

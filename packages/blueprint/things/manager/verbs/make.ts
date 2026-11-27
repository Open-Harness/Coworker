import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { BlankNotFilled } from "../errors.ts";
import { Values } from "../../../values/coworker.ts";

// Doing `manager.make`, pressed on /managers/new/:template/check. A walk's "make it" (`walk.make`) reaches it too: one
// operation, two doors (inventory, Gaps).
export default Blueprint.operation(Manager, {
  description: "Make a manager from a template, with its blanks filled, under another manager.",
  payload: { workspace: Manager.fields.workspace, template: Manager.fields.template, answers: Values, above: Manager.fields.above },
  answer: { manager: Manager.fields.id },
  move: machine.moves.make,
  errors: [BlankNotFilled],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

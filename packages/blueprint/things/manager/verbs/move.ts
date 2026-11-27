import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { AboveItself } from "../errors.ts";

// Doing `manager.move`. Registered; nothing presses it: the tree has no drag (inventory, Gaps).
export default Blueprint.operation(Manager, {
  description: "Put a manager under another one in the tree.",
  payload: { workspace: Manager.fields.workspace, manager: Manager.fields.id, above: Manager.fields.above },
  answer: {},
  errors: [AboveItself],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

import { Blueprint } from "orthograph";
import { Trigger } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { TriggerNotUnderstood } from "../errors.ts";

// Doing `trigger.add`, pressed by "Add one" (`juno/add-trigger.tsx:46`); no handler today (inventory, Gaps). The screen
// sends what makes it go as words; the co-worker reads them into `by`, `on` and `when`.
export default Blueprint.operation(Trigger, {
  description: "Add a trigger to a manager, said in words.",
  payload: { workspace: Trigger.fields.workspace, manager: Trigger.fields.manager, trigger: Trigger.fields.on },
  answer: { id: Trigger.fields.id },
  move: machine.moves.add,
  errors: [TriggerNotUnderstood],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

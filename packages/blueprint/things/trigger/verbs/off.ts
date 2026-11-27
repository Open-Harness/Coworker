import { Blueprint } from "orthograph";
import { Trigger } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `trigger.off`, the switch on the Triggers page (`juno/triggers.tsx:144`); no handler today (inventory, Gaps).
export default Blueprint.operation(Trigger, {
  description: "Turn a trigger off: nothing comes in by it until it is on again.",
  payload: { workspace: Trigger.fields.workspace, manager: Trigger.fields.manager, trigger: Trigger.fields.id },
  answer: {},
  move: machine.moves.off,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

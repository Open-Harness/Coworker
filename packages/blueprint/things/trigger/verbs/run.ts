import { Blueprint } from "orthograph";
import { Trigger } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `trigger.run`: "Run it now" (`juno/triggers.tsx:167`, `search/index.tsx:40`); no handler today, and the toast says
// Running before the answer is known (inventory, Gaps). What it finds goes to intake.
export default Blueprint.operation(Trigger, {
  description: "Run a trigger now, once, as if its time had come.",
  payload: { workspace: Trigger.fields.workspace, manager: Trigger.fields.manager, trigger: Trigger.fields.id },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

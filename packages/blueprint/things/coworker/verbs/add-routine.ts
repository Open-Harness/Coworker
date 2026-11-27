import { Blueprint } from "orthograph";
import { Coworker } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { Trigger } from "../../trigger/thing.ts";
import { TriggerNotUnderstood } from "../../trigger/errors.ts";
import { Name, Words } from "../../../values/coworker.ts";

// Doing `routine.add`. Registered; nothing presses it. The drawn Routines page has it (inventory, Built against drawn): a
// routine is the co-worker's own cron trigger, with its run history.
export default Blueprint.operation(Coworker, {
  description: "Give the co-worker a routine: something it does on its own, on a schedule.",
  payload: { workspace: Coworker.fields.workspace, coworker: Coworker.fields.id, name: Name, when: Trigger.fields.when, what: Words },
  answer: { trigger: Trigger.fields.id },
  errors: [TriggerNotUnderstood],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

import { Blueprint } from "orthograph";
import { Coworker } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";

// Doing `soul.save`. The drawn page also saves *never* and "may suggest a change"; built, both are read only (inventory,
// Built against drawn: drawn wins), so they are in the payload.
export default Blueprint.operation(Coworker, {
  description: "Save the co-worker's soul, and what it must never do.",
  payload: {
    workspace: Coworker.fields.workspace,
    coworker: Coworker.fields.id,
    soul: Coworker.fields.soul,
    never: Coworker.fields.never,
  },
  answer: {},
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

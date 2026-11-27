import { Blueprint } from "orthograph";
import { Coworker } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { PartsOverWhole } from "../errors.ts";

// Doing `spending.save`. It refuses parts that add up to more than the whole (spec C11).
export default Blueprint.operation(Coworker, {
  description: "Split what the workspace may spend among its managers, and say when to tell.",
  payload: {
    workspace: Coworker.fields.workspace,
    coworker: Coworker.fields.id,
    whole: Coworker.fields.whole,
    tellAt: Coworker.fields.tellAt,
    parts: Coworker.fields.parts,
  },
  answer: {},
  errors: [PartsOverWhole],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

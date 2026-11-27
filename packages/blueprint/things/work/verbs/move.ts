import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { member } from "../../workspace/roles.ts";
import { StepNotInKind } from "../errors.ts";

// Doing `work.move`: the board's drag and "Move to", and the task page's step. It writes `step`, which is data, so it
// has no `move:` (inventory, question 1; delta D1). The board then always presses `work.order`, which has no handler, so
// every move reports a failure today (`board/index.tsx:54-58`).
export default Blueprint.operation(Work, {
  description: "Move a piece of work to another step of its kind.",
  payload: { workspace: Work.fields.workspace, manager: Work.fields.manager, work: Work.fields.id, step: Work.fields.step },
  answer: {},
  errors: [StepNotInKind],
  allowed: [member.of("workspace")],
  idempotent: "request",
});

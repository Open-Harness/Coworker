import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { member } from "../../workspace/roles.ts";
import { NotInWorkspace } from "../errors.ts";

// Doing `work.answers`, the task page's "Who answers" (`task/index.tsx:80`); no handler today (inventory, Gaps).
export default Blueprint.operation(Work, {
  description: "Choose the person who answers for a piece of work.",
  payload: { workspace: Work.fields.workspace, manager: Work.fields.manager, work: Work.fields.id, person: Work.fields.answers },
  answer: {},
  errors: [NotInWorkspace],
  allowed: [member.of("workspace")],
  idempotent: "request",
});

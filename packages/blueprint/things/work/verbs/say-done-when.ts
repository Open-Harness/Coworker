import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// Doing `work.done_when`, the task page's "Add done when" (`task/index.tsx:92`); no handler today (inventory, Gaps).
export default Blueprint.operation(Work, {
  description: "Say what must be true for the work to be done.",
  payload: { workspace: Work.fields.workspace, manager: Work.fields.manager, work: Work.fields.id, checks: Work.fields.doneWhen },
  answer: {},
  allowed: [member.of("workspace")],
  idempotent: "request",
});

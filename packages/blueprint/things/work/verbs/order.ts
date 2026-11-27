import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { member } from "../../workspace/roles.ts";
import { NotOnBoard } from "../errors.ts";

// Doing `work.order`, pressed after every board move; no handler today (inventory, Gaps). Both fields are optional in
// the registry: `before` is the work it goes before, and an empty one puts it last.
export default Blueprint.operation(Work, {
  description: "Put a piece of work in order on its manager's board, and say how urgent it is.",
  payload: {
    workspace: Work.fields.workspace,
    manager: Work.fields.manager,
    work: Work.fields.id,
    before: Work.fields.id,
    priority: Work.fields.priority,
  },
  answer: {},
  errors: [NotOnBoard],
  allowed: [member.of("workspace")],
  idempotent: "request",
});

import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";
import { KindNotInPlaybook } from "../errors.ts";

// Doing `work.add`. It has a handler and is never pressed: the board's Add work only toasts (`board-kit/layout.tsx:178`,
// inventory, Gaps). The palette names it but only navigates.
export default Blueprint.operation(Work, {
  description: "Add a piece of work to a manager, of one of its kinds.",
  payload: {
    workspace: Work.fields.workspace,
    manager: Work.fields.manager,
    kind: Work.fields.kind,
    title: Work.fields.title,
    about: Work.fields.about,
  },
  answer: { work: Work.fields.id },
  move: machine.moves.add,
  errors: [KindNotInPlaybook],
  allowed: [member.of("workspace")],
  idempotent: "request",
});

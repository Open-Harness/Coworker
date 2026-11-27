import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";

// Doing `work.stop`. It has a handler and no screen presses it: the task page has no stop (inventory, Gaps).
export default Blueprint.operation(Work, {
  description: "Stop a piece of work, saying why. Its threads stop at once.",
  payload: { workspace: Work.fields.workspace, manager: Work.fields.manager, work: Work.fields.id, why: Work.fields.why },
  answer: {},
  move: machine.moves.stop,
  allowed: [member.of("workspace")],
  idempotent: "request",
});

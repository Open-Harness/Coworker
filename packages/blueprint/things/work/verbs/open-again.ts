import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";

// Doing `work.open_again`. Registered; nothing presses it (inventory, Gaps). People only: off for the co-worker (delta D4).
export default Blueprint.operation(Work, {
  description: "Open ended work again, saying why.",
  payload: { workspace: Work.fields.workspace, manager: Work.fields.manager, work: Work.fields.id, why: Work.fields.why },
  answer: {},
  move: machine.moves.openAgain,
  allowed: [member.of("workspace")],
  idempotent: "request",
});

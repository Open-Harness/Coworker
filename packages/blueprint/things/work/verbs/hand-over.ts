import { Blueprint } from "orthograph";
import { Work } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { HandOverWrong } from "../errors.ts";
import { Manager } from "../../manager/thing.ts";
import { Words } from "../../../values/coworker.ts";

// Doing `work.hand_over`. Registered; nothing presses it (inventory, Gaps). `part` says what goes with it.
export default Blueprint.operation(Work, {
  description: "Hand a piece of work over to another manager.",
  payload: { workspace: Work.fields.workspace, manager: Work.fields.manager, work: Work.fields.id, to: Manager.fields.id, part: Words },
  answer: {},
  move: machine.moves.handOver,
  errors: [HandOverWrong],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

import { Blueprint } from "orthograph";
import { Ask } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";
import { NotAnApproval, NotAskedOfYou } from "../errors.ts";

// Doing `ask.approve`. Registered; nothing presses it. A yes lets a parked action call run (delta D8).
export default Blueprint.operation(Ask, {
  description: "Say yes to an ask that needs one.",
  payload: { workspace: Ask.fields.workspace, ask: Ask.fields.id },
  answer: {},
  move: machine.moves.answer,
  errors: [NotAnApproval, NotAskedOfYou],
  allowed: [member.of("workspace")],
  idempotent: "request",
});

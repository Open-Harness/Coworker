import { Blueprint } from "orthograph";
import { Walk } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// `POST /set-up {said}`, from /set-up and /managers/new. Not a registered doing.
export default Blueprint.operation(Walk, {
  description: "Start setting a manager up by saying what it should do.",
  payload: { workspace: Walk.fields.workspace, said: Walk.fields.said },
  answer: { walk: Walk.fields.id },
  move: machine.moves.start,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

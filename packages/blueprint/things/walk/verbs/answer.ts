import { Blueprint } from "orthograph";
import { Walk } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { Values } from "../../../values/coworker.ts";

// `POST /set-up/:walk {is: "answers"}` (`walk.tsx:75`). Not a registered doing.
export default Blueprint.operation(Walk, {
  description: "Answer the co-worker's questions about the manager being set up.",
  payload: { workspace: Walk.fields.workspace, walk: Walk.fields.id, answers: Values },
  answer: {},
  move: machine.moves.answer,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

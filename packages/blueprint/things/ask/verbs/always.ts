import { Blueprint } from "orthograph";
import { Ask } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { NotAnOption, NotAskedOfYou } from "../errors.ts";
import { Always } from "../../../values/coworker.ts";

// Doing `ask.always`. Registered; nothing presses it, and `/inbox/:ask` has an `always` field no control fills
// (inventory, Gaps). It answers the ask and keeps a `rule`.
export default Blueprint.operation(Ask, {
  description: "Answer an ask, and give the same answer from now on, for its thread, its person or its kind.",
  payload: { workspace: Ask.fields.workspace, ask: Ask.fields.id, answer: Ask.fields.answer, for: Always },
  answer: {},
  move: machine.moves.answer,
  errors: [NotAnOption, NotAskedOfYou],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

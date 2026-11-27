import { Blueprint } from "orthograph";
import { Join } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../workspace/roles.ts";

// Doing `person.let_in`.
export default Blueprint.operation(Join, {
  description: "Let someone in who asked to join. They come in as a Member.",
  payload: { workspace: Join.fields.workspace, join: Join.fields.id },
  answer: {},
  move: machine.moves.letIn,
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

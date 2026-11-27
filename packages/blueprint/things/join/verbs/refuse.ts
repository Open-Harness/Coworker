import { Blueprint } from "orthograph";
import { Join } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../workspace/roles.ts";

// Doing `person.say_no`.
export default Blueprint.operation(Join, {
  description: "Say no to someone who asked to join.",
  payload: { workspace: Join.fields.workspace, join: Join.fields.id },
  answer: {},
  move: machine.moves.refuse,
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

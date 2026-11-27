import { Blueprint } from "orthograph";
import { Note } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";

// Doing `note.forget`. Pressed on the Memory page.
export default Blueprint.operation(Note, {
  description: "Forget a note the co-worker kept.",
  payload: { workspace: Note.fields.workspace, note: Note.fields.id },
  answer: {},
  move: machine.moves.forget,
  allowed: [member.of("workspace")],
  idempotent: "request",
});

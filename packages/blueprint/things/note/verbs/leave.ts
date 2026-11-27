import { Blueprint } from "orthograph";
import { Note } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";

// Doing `note.leave`.  it is not kept.:Pressed on the Memory page; no handler today (inventory, Gaps).
export default Blueprint.operation(Note, {
  description: "Leave a note the co-worker proposed",
  payload: { workspace: Note.fields.workspace, note: Note.fields.id },
  answer: {},
  move: machine.moves.leave,
  allowed: [member.of("workspace")],
  idempotent: "request",
});

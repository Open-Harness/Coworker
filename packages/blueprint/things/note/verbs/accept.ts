import { Blueprint } from "orthograph";
import { Note } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `note.accept`. Pressed on the Memory page; no handler today (inventory, Gaps).
export default Blueprint.operation(Note, {
  description: "Keep a note the co-worker proposed.",
  payload: { workspace: Note.fields.workspace, note: Note.fields.id },
  answer: {},
  move: machine.moves.accept,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

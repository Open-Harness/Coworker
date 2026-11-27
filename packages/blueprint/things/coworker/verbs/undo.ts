import { Blueprint } from "orthograph";
import { Coworker } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { CannotUndo } from "../errors.ts";
import { Key } from "../../../values/coworker.ts";

// Doing `history.undo`. Pressed on the History page; no handler today (inventory, Gaps). Each doing names its undo in the
// registry; this runs it for one entry of the history.
export default Blueprint.operation(Coworker, {
  description: "Undo one thing the co-worker did, from its history.",
  payload: { workspace: Coworker.fields.workspace, coworker: Coworker.fields.id, entry: Key },
  answer: {},
  errors: [CannotUndo],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

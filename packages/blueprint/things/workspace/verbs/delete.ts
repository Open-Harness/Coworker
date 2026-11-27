import { Blueprint } from "orthograph";
import { Workspace } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../roles.ts";
import { NameNotTyped } from "../errors.ts";
import { At } from "../../../values/coworker.ts";

// Doing `workspace.delete`. The date it is gone is said at once (spec L4).
export default Blueprint.operation(Workspace, {
  description: "Delete the workspace for good, 30 days from now. The Owner types its name.",
  payload: { workspace: Workspace.fields.id, typed: Workspace.fields.name },
  answer: { goneAt: At },
  move: machine.moves.delete,
  errors: [NameNotTyped],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

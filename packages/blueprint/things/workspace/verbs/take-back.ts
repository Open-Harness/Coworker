import { Blueprint } from "orthograph";
import { Workspace } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../roles.ts";

// Doing `workspace.take_back`. Registered; no screen presses it.
export default Blueprint.operation(Workspace, {
  description: "Take back a workspace that is being deleted.",
  payload: { workspace: Workspace.fields.id },
  answer: {},
  move: machine.moves.takeBack,
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

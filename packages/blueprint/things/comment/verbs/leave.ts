import { Blueprint } from "orthograph";
import { Comment } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `suggestion.leave` (`playbook/changes.ts:46`).
export default Blueprint.operation(Comment, {
  description: "Leave the change the co-worker offered.",
  payload: { workspace: Comment.fields.workspace, manager: Comment.fields.manager, comment: Comment.fields.id },
  answer: {},
  move: machine.moves.leave,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

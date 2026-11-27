import { Blueprint } from "orthograph";
import { Comment } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `suggestion.accept` (`playbook/changes.ts:46`).
export default Blueprint.operation(Comment, {
  description: "Take the change the co-worker offered: it goes into the playbook's next version.",
  payload: { workspace: Comment.fields.workspace, manager: Comment.fields.manager, comment: Comment.fields.id },
  answer: {},
  move: machine.moves.accept,
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

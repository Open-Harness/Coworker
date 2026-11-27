import { Blueprint } from "orthograph";
import { Comment } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";

// Doing `line.comment` (`playbook/changes.ts:51`). The Skills page of Juno gives it the set-up skill's id as `manager`,
// and in a draft it writes nothing (inventory, Gaps).
export default Blueprint.operation(Comment, {
  description: "Comment on a line of a playbook. The co-worker answers it.",
  payload: { workspace: Comment.fields.workspace, manager: Comment.fields.manager, line: Comment.fields.line, text: Comment.fields.text },
  answer: { comment: Comment.fields.id },
  move: machine.moves.make,
  allowed: [member.of("workspace")],
  idempotent: "request",
});

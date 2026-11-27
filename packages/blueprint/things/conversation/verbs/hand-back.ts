import { Blueprint } from "orthograph";
import { Conversation } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";
import { NotYours } from "../errors.ts";

// Doing `conversation.hand_back`, reached as `{is: "hand back"}` (`email/open.tsx:38`). Slack hard-codes `isYours={false}`,
// so it never shows there (inventory, Gaps).
export default Blueprint.operation(Conversation, {
  description: "Hand a conversation back to the manager.",
  payload: { workspace: Conversation.fields.workspace, conversation: Conversation.fields.id },
  answer: {},
  move: machine.moves.handBack,
  errors: [NotYours],
  allowed: [member.of("workspace")],
  idempotent: "request",
});

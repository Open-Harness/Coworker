import { Blueprint } from "orthograph";
import { Conversation } from "../thing.ts";
import { machine } from "../machine.ts";
import { member } from "../../workspace/roles.ts";
import { Words } from "../../../values/coworker.ts";

// Doing `conversation.write`, reached as `{is: "write"}` today (`email/open.tsx:37`, `whatsapp/view.tsx:36`, `slack/view.tsx:36`,
// `github/view.tsx:43`). Writing takes the conversation from the manager.
export default Blueprint.operation(Conversation, {
  description: "Write in a conversation yourself. You hold it until you hand it back.",
  payload: { workspace: Conversation.fields.workspace, conversation: Conversation.fields.id, text: Words },
  answer: {},
  move: machine.moves.take,
  allowed: [member.of("workspace")],
  idempotent: "request",
});

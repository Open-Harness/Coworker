import { Blueprint } from "orthograph";
import { Conversation } from "../thing.ts";
import { member } from "../../workspace/roles.ts";
import { Words } from "../../../values/coworker.ts";

// Doing `conversation.tell`. Registered; the connector views reach it as `POST …/:connector/:conversation {is: "tell"}`
// (`email/open.tsx:36`), a second door (inventory, Gaps). The manager reads it; nothing is sent outside.
export default Blueprint.operation(Conversation, {
  description: "Tell the manager something about a conversation. Nobody outside sees it.",
  payload: {
    workspace: Conversation.fields.workspace,
    manager: Conversation.fields.manager,
    conversation: Conversation.fields.id,
    text: Words,
  },
  answer: {},
  allowed: [member.of("workspace")],
  idempotent: "request",
});

import { Blueprint } from "orthograph";
import { Chat } from "../thing.ts";
import { member } from "../../workspace/roles.ts";
import { LineNotFound } from "../errors.ts";
import { Key } from "../../../values/coworker.ts";

// Doing `chat.fork`, also `POST /chats/:chat/fork`. No control presses either (inventory, Gaps). The fork is a new chat
// inside the same object, not a new one (inventory, question 3).
export default Blueprint.operation(Chat, {
  description: "Fork a chat from one of its lines: the fork knows everything up to it.",
  payload: { workspace: Chat.fields.workspace, chat: Chat.fields.id, message: Key },
  answer: { fork: Chat.fields.id },
  errors: [LineNotFound],
  allowed: [member.of("workspace")],
  idempotent: "request",
});

import { Blueprint } from "orthograph";
import { Chat } from "../thing.ts";
import { member } from "../../workspace/roles.ts";
import { ChatBusy } from "../errors.ts";
import { Key, Words } from "../../../values/coworker.ts";

// `POST /chats/:chat {text, key}`. Not a registered doing: a chat line is not something the co-worker does for someone.
export default Blueprint.operation(Chat, {
  description: "Say something in a chat. The co-worker answers in it.",
  payload: { workspace: Chat.fields.workspace, chat: Chat.fields.id, text: Words, key: Key },
  answer: {},
  errors: [ChatBusy],
  allowed: [member.of("workspace")],
  idempotent: "request",
});

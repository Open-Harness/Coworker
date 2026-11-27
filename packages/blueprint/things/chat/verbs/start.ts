import { Blueprint } from "orthograph";
import { Chat } from "../thing.ts";
import { member } from "../../workspace/roles.ts";
import { Key, Words } from "../../../values/coworker.ts";

// Doing `chat.new`, which no screen presses: Home and the dock reach it as `POST /chats {text, key}`, a second door
// (inventory, Gaps). The dock also sends the place it was opened on.
export default Blueprint.operation(Chat, {
  description: "Start a chat with the co-worker, with its first words.",
  payload: { workspace: Chat.fields.workspace, text: Words, place: Words, key: Key },
  answer: { chat: Chat.fields.id },
  allowed: [member.of("workspace")],
  idempotent: "request",
});

import { Blueprint } from "orthograph";
import { Chat } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /chats/:chat`. Its lines are the Pi transcript in the chat's object, not fields: delta D6.
export default Blueprint.read(Chat, {
  by: "id",
  fields: ["title", "with", "where", "under", "knew"],
  allowed: [member.of("workspace")],
});

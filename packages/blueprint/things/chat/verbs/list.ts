import { Blueprint } from "orthograph";
import { Chat } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// `GET /chats`. A list over actors is refused by Orthograph's compiler (F5): the list is an index row per chat in the
// workspace's object, kept from each chat's object. That projection is delta D2.
export default Blueprint.read(Chat, {
  where: ["workspace", "under"],
  order: "newest",
  page: 50,
  allowed: [member.of("workspace")],
});

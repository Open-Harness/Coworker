import { Blueprint } from "orthograph";
import { Conversation } from "../thing.ts";
import { member } from "../../workspace/roles.ts";

// A connector's view: `…/email`, `…/whatsapp`, `…/slack`, `…/github`. Across works it reads an index (delta D2).
export default Blueprint.read(Conversation, {
  where: ["workspace", "manager", "work", "has", "state"],
  order: "newest",
  page: 100,
  allowed: [member.of("workspace")],
});

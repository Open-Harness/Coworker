import { Blueprint } from "orthograph";
import { Workspace } from "../workspace/thing.ts";
import { Count, Name, Title, Words } from "../../values/coworker.ts";

// An actor: one Durable Object per root chat. Its forks live in the same object, because Pi forks only work inside one
// storage (inventory, question 3), so `under` and `knew` name a fork's parent and the lines it knows. Whether it is
// working, waits or is quiet is the loop's, not a machine (delta D5). The chats list is an index in the workspace's object
// (delta D2).
export const Chat = Blueprint.thing({
  description: "A chat with the co-worker, or a fork of one that knows its lines up to where it forked.",
  code: "CH",
  lives: "actor",
  fields: {
    id: Blueprint.id("chat"),
    workspace: Workspace.fields.id,
    title: Title,
    with: Name,
    where: Words,
    under: Blueprint.id("chat"),
    knew: Count,
  },
});

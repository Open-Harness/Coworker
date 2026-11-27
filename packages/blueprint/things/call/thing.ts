import { Blueprint } from "orthograph";
import workStore from "../../stores/work.ts";
import { Workspace } from "../workspace/thing.ts";
import { Work } from "../work/thing.ts";
import { Thread } from "../thread/thing.ts";
import { Key, Name, Permission, Words } from "../../values/coworker.ts";

// One call of an action by a thread, through the one door every action goes through (the audit's "one door"), inside the
// work's object. An action set to ask parks until a person says yes (spec H3, A3): delta D8.
export const Call = Blueprint.thing({
  description: "A thread calling an action on an account: what it asked, whether it needed a yes, and how it ended.",
  code: "AC",
  lives: workStore,
  fields: {
    id: Blueprint.id("call"),
    workspace: Workspace.fields.id,
    work: Work.fields.id,
    thread: Thread.fields.id,
    action: Name,
    account: Key,
    permission: Permission,
    key: Key,
    says: Words,
  },
});

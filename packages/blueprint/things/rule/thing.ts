import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Ask } from "../ask/thing.ts";
import { Always, Key, Words } from "../../values/coworker.ts";

// An always-answer, kept from `ask.always`, inside the workspace's object because it spans works (spec A6). No lifecycle:
// taking it away removes the row.
export const Rule = Blueprint.thing({
  description: "An answer given once for every ask like it: for one thread, one person or one kind of work.",
  code: "RU",
  lives: workspaceStore,
  fields: { id: Blueprint.id("rule"), workspace: Workspace.fields.id, from: Ask.fields.id, for: Always, of: Key, answer: Words },
});

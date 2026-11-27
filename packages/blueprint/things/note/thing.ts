import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Name, Words } from "../../values/coworker.ts";

// One of the co-worker's memory notes, inside the workspace's object (the Memory page).
export const Note = Blueprint.thing({
  description: "Something the co-worker remembers: what it is for, what it tells, and who said it.",
  code: "NO",
  lives: workspaceStore,
  fields: { id: Blueprint.id("note"), workspace: Workspace.fields.id, for: Words, tell: Words, saidBy: Name },
});

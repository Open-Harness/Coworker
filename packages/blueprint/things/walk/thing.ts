import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Count, Files, Words } from "../../values/coworker.ts";

// Setting a manager up by talking it through: a draft playbook, not yet a manager, inside the workspace's object. What it
// heard, asked, looked at and found are lines of its conversation with the co-worker, not fields (delta D6).
export const Walk = Blueprint.thing({
  description: "Setting a manager up by talking: what was said, the questions and answers, what it found, and the draft.",
  code: "WA",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("walk"),
    workspace: Workspace.fields.id,
    said: Words,
    rounds: Count,
    wants: Words,
    objective: Words,
    draft: Files,
  },
});

import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Manager } from "../manager/thing.ts";
import { Count, Files, Part, VersionNumber, Words } from "../../values/coworker.ts";

// A change to a playbook tried on past work before it is used (spec O4-O6), inside the workspace's object. The compare
// page shows its scores now and next, the cases that differ, and the ones that got worse.
export const Trial = Blueprint.thing({
  description: "A change to a manager's playbook, tried on past work: what changed, and how it scored against now.",
  code: "TL",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("trial"),
    workspace: Workspace.fields.id,
    manager: Manager.fields.id,
    of: VersionNumber,
    part: Part,
    changes: Files,
    why: Words,
    differ: Count,
    worse: Count,
  },
});

import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Manager } from "../manager/thing.ts";
import { Files, VersionNumber, Words } from "../../values/coworker.ts";

// A manager's playbook, inside the workspace's object. It has no machine: every save is a new version row, and going back
// is a new version too (spec B4). Its kinds, steps, triggers, agents, skills, reach and evals are its files (spec B1).
export const Playbook = Blueprint.thing({
  description: "A manager's playbook: its files, at one version, with its objective and its reach.",
  code: "PB",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("pb"),
    workspace: Workspace.fields.id,
    manager: Manager.fields.id,
    version: VersionNumber,
    files: Files,
    objective: Words,
    reach: Words,
  },
});

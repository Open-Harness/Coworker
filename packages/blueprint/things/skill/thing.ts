import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Files, Layer, Name, VersionNumber } from "../../values/coworker.ts";

// A shared skill, inside the workspace's object; big files are in R2. A craft skill is cut when it does not help (its
// with-and-without scores). Adding one to a playbook is `playbook`'s `add-skill`.
export const Skill = Blueprint.thing({
  description: "A skill the workspace shares: its layer, its files, at a version.",
  code: "SK",
  lives: workspaceStore,
  fields: { id: Blueprint.id("skill"), workspace: Workspace.fields.id, name: Name, layer: Layer, files: Files, version: VersionNumber },
});

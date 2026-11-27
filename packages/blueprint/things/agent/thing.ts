import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Checks, ModelChoice, Name, VersionNumber, Words } from "../../values/coworker.ts";

// A shared agent, inside the workspace's object. A manager that uses it keeps its own copy, at a version.
export const Agent = Blueprint.thing({
  description: "An agent the workspace shares: what it is told, its model, its tools and skills, at a version.",
  code: "AG",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("agent"),
    workspace: Workspace.fields.id,
    name: Name,
    told: Words,
    model: ModelChoice,
    tools: Checks,
    skills: Checks,
    version: VersionNumber,
  },
});

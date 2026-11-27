import { Blueprint } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Person } from "../person/thing.ts";
import { Template } from "../template/thing.ts";
import { Cents, ModelChoice, Title, VersionNumber, Words } from "../../values/coworker.ts";

// Configuration, not an actor (the settled decision): a row in the workspace's object, in a tree by `above`. Its
// playbook is `playbook`; its open and waiting counts come from the work index (delta D2). Needs you, idle and stuck are
// worked out from its work, not states.
export const Manager = Blueprint.thing({
  description: "A manager: a playbook that takes on one kind of work, with a person who answers for it, in a tree.",
  code: "MA",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("mgr"),
    workspace: Workspace.fields.id,
    name: Title,
    above: Blueprint.id("mgr"),
    version: VersionNumber,
    objective: Words,
    answers: Person.fields.id,
    model: ModelChoice,
    perWork: Cents,
    perDay: Cents,
    template: Template.fields.id,
  },
});

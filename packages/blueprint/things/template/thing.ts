import { Blueprint, Schema } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Files, Name, Title, VersionNumber, Words } from "../../values/coworker.ts";

// A playbook to start a manager from, with blanks to fill (place, person, number, text, model). Ours ship in code; the
// ones a workspace saves are kept inside its object.
export const Template = Blueprint.thing({
  description: "A playbook to make a manager from, with the blanks a person fills when they make one.",
  code: "TE",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("tmpl"),
    workspace: Workspace.fields.id,
    name: Title,
    about: Words,
    whose: Blueprint.value(Schema.Literals(["ours", "workspace"])),
    version: VersionNumber,
    blanks: Blueprint.value(Schema.Record(Schema.String, Schema.Literals(["place", "person", "number", "text", "model"]))),
    files: Files,
    by: Name,
  },
});

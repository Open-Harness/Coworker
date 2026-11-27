import { Blueprint } from "orthograph";
import { Workspace } from "../workspace/thing.ts";
import { Person } from "../person/thing.ts";

// A row in D1: someone whose mail domain the workspace knows asks to come in; an Owner says yes or no (spec P3).
export const Join = Blueprint.thing({
  description: "A person asking to join a workspace they found by their mail's domain.",
  code: "JO",
  fields: { id: Blueprint.id("join"), workspace: Workspace.fields.id, person: Person.fields.id },
});

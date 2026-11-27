import { Blueprint } from "orthograph";
import { Workspace } from "../thing.ts";
import { owner } from "../roles.ts";
import { SoleOwner } from "../errors.ts";
import { Person } from "../../person/thing.ts";

// Doing `person.remove`. They lose everything at once, and what they lent ends (spec L5).
export default Blueprint.operation(Workspace, {
  description: "Take someone out of the workspace.",
  payload: { workspace: Workspace.fields.id, person: Person.fields.id },
  answer: {},
  errors: [SoleOwner],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

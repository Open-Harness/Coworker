import { Blueprint } from "orthograph";
import { Workspace } from "../thing.ts";
import { owner } from "../roles.ts";
import { SoleOwner } from "../errors.ts";
import { Role } from "../../../values/coworker.ts";
import { Person } from "../../person/thing.ts";

// Doing `person.role`.
export default Blueprint.operation(Workspace, {
  description: "Change someone's role in the workspace.",
  payload: { workspace: Workspace.fields.id, person: Person.fields.id, role: Role },
  answer: {},
  errors: [SoleOwner],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

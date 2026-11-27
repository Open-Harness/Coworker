import { Blueprint } from "orthograph";
import { Workspace } from "../workspace/thing.ts";
import { At, Mail, Role } from "../../values/coworker.ts";

// A row in D1: an invite is answered before the person is in any workspace.
export const Invite = Blueprint.thing({
  description: "An invite to a workspace, to one mail, with the role they will have.",
  code: "IN",
  fields: { id: Blueprint.id("invite"), workspace: Workspace.fields.id, mail: Mail, role: Role, until: At },
});

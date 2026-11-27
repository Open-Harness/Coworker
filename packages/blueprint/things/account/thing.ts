import { Blueprint, Schema } from "orthograph";
import workspaceStore from "../../stores/workspace.ts";
import { Workspace } from "../workspace/thing.ts";
import { Person } from "../person/thing.ts";
import { ConnectorId, Name, Words } from "../../values/coworker.ts";

// A connected account, as a record in the workspace's object; its token is in the vault, by name (spec X5). It is the
// workspace's, or lent by a person, who sees what it reads (spec X14).
export const Account = Blueprint.thing({
  description: "An account on a connector: as whom it acts, who holds it, what it may reach, and whether it works.",
  code: "AN",
  lives: workspaceStore,
  fields: {
    id: Blueprint.id("acct"),
    workspace: Workspace.fields.id,
    connector: ConnectorId,
    as: Name,
    holder: Blueprint.value(Schema.Literals(["workspace", "lent"])),
    lentBy: Person.fields.id,
    scope: Words,
    places: Words,
  },
});

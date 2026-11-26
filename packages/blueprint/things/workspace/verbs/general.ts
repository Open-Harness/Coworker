import { Blueprint } from "orthograph";
import { Workspace } from "../thing.ts";
import { owner } from "../roles.ts";
import { AddressTaken, LimitWrong } from "../errors.ts";
import { Permission } from "../../../values/coworker.ts";

// Doing `workspace.general`. Today's handler keeps two of these fields and says Done for all of them (inventory, Gaps).
export default Blueprint.operation(Workspace, {
  description: "Change the workspace's name, address, time zone, daily limit, when to tell, and what its people may do alone.",
  payload: {
    workspace: Workspace.fields.id,
    name: Workspace.fields.name,
    address: Workspace.fields.address,
    perDay: Workspace.fields.perDay,
    tellAt: Workspace.fields.tellAt,
    mayMake: Permission,
    mayTry: Permission,
    mayJoin: Permission,
  },
  answer: {},
  errors: [AddressTaken, LimitWrong],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

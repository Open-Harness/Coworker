import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { VersionNotFound } from "../errors.ts";

// Doing `version.go_back`, pressed on the versions page; no handler today (inventory, Gaps). Going back is a new version (spec B4).
export default Blueprint.operation(Playbook, {
  description: "Go back to an earlier version: its files become a new version.",
  payload: { workspace: Playbook.fields.workspace, manager: Playbook.fields.manager, version: Playbook.fields.version },
  answer: {},
  errors: [VersionNotFound],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

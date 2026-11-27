import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { Name, Words } from "../../../values/coworker.ts";

// Doing `skill.add`. Registered; nothing presses it (inventory, Gaps).
export default Blueprint.operation(Playbook, {
  description: "Add a skill to the playbook, with its name and what it says.",
  payload: { workspace: Playbook.fields.workspace, manager: Playbook.fields.manager, name: Name, says: Words },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

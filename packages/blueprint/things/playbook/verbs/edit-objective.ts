import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";

// Doing `objective.edit`. Registered; the Objective part only marks the page dirty (inventory, Gaps).
export default Blueprint.operation(Playbook, {
  description: "Change the manager's objective: what it counts, where it reads it, and the aim.",
  payload: { workspace: Playbook.fields.workspace, manager: Playbook.fields.manager, objective: Playbook.fields.objective },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

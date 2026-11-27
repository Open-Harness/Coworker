import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { Key } from "../../../values/coworker.ts";

// Doing `eval.retire`. Registered; nothing presses it (inventory, Gaps).
export default Blueprint.operation(Playbook, {
  description: "Retire an eval the playbook no longer needs.",
  payload: { workspace: Playbook.fields.workspace, manager: Playbook.fields.manager, eval: Key },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

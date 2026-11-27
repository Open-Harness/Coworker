import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { ReachWider } from "../errors.ts";

// Doing `reach.edit`. Registered; the Reach part only marks the page dirty (inventory, Gaps). Refuses a reach wider than the manager above (spec R1).
export default Blueprint.operation(Playbook, {
  description: "Change what the manager may reach: its accounts, places and money, a part of the one above.",
  payload: { workspace: Playbook.fields.workspace, manager: Playbook.fields.manager, reach: Playbook.fields.reach },
  answer: {},
  errors: [ReachWider],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

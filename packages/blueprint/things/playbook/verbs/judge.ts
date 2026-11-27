import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { member } from "../../workspace/roles.ts";
import { Key, Should } from "../../../values/coworker.ts";

// Doing `eval.judge`. Registered; nothing presses it (inventory, Gaps).
export default Blueprint.operation(Playbook, {
  description: "Judge one case of an eval: say whether what was done was right.",
  payload: { workspace: Playbook.fields.workspace, manager: Playbook.fields.manager, case: Key, said: Should },
  answer: {},
  allowed: [member.of("workspace")],
  idempotent: "request",
});

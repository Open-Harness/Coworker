import { Blueprint } from "orthograph";
import { Playbook } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { Part } from "../../../values/coworker.ts";

// Not registered: every part edit (page, workflow, steps, triggers, agents, limits, cases) is local state today and marks the page dirty (inventory, Gaps). Declared here; the binding marks it planned.
export default Blueprint.operation(Playbook, {
  description: "Change one part of the playbook's files, before the version is saved.",
  payload: { workspace: Playbook.fields.workspace, manager: Playbook.fields.manager, part: Part, files: Playbook.fields.files },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

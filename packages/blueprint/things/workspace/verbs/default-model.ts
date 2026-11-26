import { Blueprint } from "orthograph";
import { Workspace } from "../thing.ts";
import { owner } from "../roles.ts";
import { ModelChoice } from "../../../values/coworker.ts";

// Doing `models.default`: the workspace's model, the last one an agent falls back to (spec M2).
export default Blueprint.operation(Workspace, {
  description: "Choose the workspace's model and thinking level.",
  payload: { workspace: Workspace.fields.id, model: ModelChoice },
  answer: {},
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

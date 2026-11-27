import { Blueprint } from "orthograph";
import { Environment } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { EnvironmentInUse } from "../errors.ts";

// Doing `environment.remove`. Registered; nothing presses it (inventory, Gaps).
export default Blueprint.operation(Environment, {
  description: "Remove an environment no manager uses.",
  payload: { workspace: Environment.fields.workspace, environment: Environment.fields.id },
  answer: {},
  errors: [EnvironmentInUse],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

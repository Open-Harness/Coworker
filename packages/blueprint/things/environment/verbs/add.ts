import { Blueprint } from "orthograph";
import { Environment } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { EnvironmentNameTaken } from "../errors.ts";

// Doing `environment.add`. The detail page presses it to add a secret (`environment-detail.tsx:164`), while the registry
// means a new environment (inventory, Gaps). Here it is the new environment; the secret is `set-secret`.
export default Blueprint.operation(Environment, {
  description: "Add an environment: a name, a size, and how it is set up.",
  payload: {
    workspace: Environment.fields.workspace,
    name: Environment.fields.name,
    setUp: Environment.fields.setUp,
    size: Environment.fields.size,
  },
  answer: { environment: Environment.fields.id },
  errors: [EnvironmentNameTaken],
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

import { Blueprint } from "orthograph";
import { Environment } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";
import { Name, SecretValue } from "../../../values/coworker.ts";

// Not registered: the detail page presses `environment.add` for it, and removing one is local (`environment-detail.tsx:149`).
// Declared here; the binding marks it planned. The value goes to the vault as a `key`.
export default Blueprint.operation(Environment, {
  description: "Give an environment a secret by name, or replace it.",
  payload: { workspace: Environment.fields.workspace, environment: Environment.fields.id, name: Name, value: SecretValue },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

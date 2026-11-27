import { Blueprint } from "orthograph";
import { Environment } from "../thing.ts";
import { builder } from "../../workspace/roles.ts";

// Not registered: Save on the environments page only toasts (`environments.tsx:24`, inventory, Gaps). Declared here; the
// binding marks it planned.
export default Blueprint.operation(Environment, {
  description: "Change an environment's size and how it is set up.",
  payload: {
    workspace: Environment.fields.workspace,
    environment: Environment.fields.id,
    size: Environment.fields.size,
    setUp: Environment.fields.setUp,
  },
  answer: {},
  allowed: [builder.of("workspace")],
  idempotent: "request",
});

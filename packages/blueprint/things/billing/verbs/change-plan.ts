import { Blueprint } from "orthograph";
import { Billing } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { CardRefused } from "../errors.ts";

// Doing `billing.change_plan`. Registered; nothing presses it: Change plan only toasts (`billing.tsx:69`, inventory, Gaps).
export default Blueprint.operation(Billing, {
  description: "Change the workspace's plan.",
  payload: { workspace: Billing.fields.workspace, plan: Billing.fields.plan },
  answer: {},
  errors: [CardRefused],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

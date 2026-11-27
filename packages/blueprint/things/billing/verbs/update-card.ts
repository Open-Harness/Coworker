import { Blueprint } from "orthograph";
import { Billing } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { Url } from "../../../values/coworker.ts";

// Doing `billing.update_card`. Registered; nothing presses it: Update card only toasts (`billing.tsx:74`). The card is
// entered on the payment provider's page; the answer is its link.
export default Blueprint.operation(Billing, {
  description: "Change the card the workspace pays with, on the payment provider's page.",
  payload: { workspace: Billing.fields.workspace },
  answer: { link: Url },
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

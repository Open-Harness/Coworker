import { Blueprint } from "orthograph";
import { Billing } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";
import { InvoiceNotFound } from "../errors.ts";
import { Key, Url } from "../../../values/coworker.ts";

// Doing `billing.download` (`billing.tsx:57`); no handler today (inventory, Gaps). The invoice is a file in R2.
export default Blueprint.operation(Billing, {
  description: "Download one invoice.",
  payload: { workspace: Billing.fields.workspace, invoice: Key },
  answer: { link: Url },
  errors: [InvoiceNotFound],
  allowed: [owner.of("workspace")],
  idempotent: "request",
});

import { Blueprint } from "orthograph";
import { Billing } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";

// `GET /settings/billing`. Its invoices are R2 files, listed with it.
export default Blueprint.read(Billing, {
  by: "id",
  fields: ["plan", "people", "perPerson", "boxHours", "nextInvoice"],
  allowed: [owner.of("workspace")],
});

import { Blueprint, Schema } from "orthograph";
import { Workspace } from "../workspace/thing.ts";
import { At, Cents, Count } from "../../values/coworker.ts";

// A row in D1, one per workspace: what it pays for and when. Invoices are files in R2; the card is with the payment
// provider, never here.
export const Billing = Blueprint.thing({
  description: "What a workspace pays: its plan, the price per person and per box hour, and its next invoice.",
  code: "BI",
  fields: {
    id: Blueprint.id("bill"),
    workspace: Workspace.fields.id,
    plan: Blueprint.value(Schema.Literals(["free", "team", "business"])),
    people: Count,
    perPerson: Cents,
    boxHours: Count,
    nextInvoice: At,
  },
});

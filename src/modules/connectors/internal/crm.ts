import type { Connector } from "../types.ts";
import { act, arg } from "./make.ts";

type Part = Pick<Connector, "id" | "name" | "setUp" | "events" | "actions" | "skills" | "view">;

export const crm: Part = {
  id: "crm",
  name: "CRM",
  view: "deals",
  skills: ["crm"],
  setUp: [
    { id: "connect_account", by: "person", says: "Sign in to the CRM and allow access." },
    { id: "check_access", by: "itself", says: "Check what it can read and change." },
  ],
  events: [{ id: "deal_moved", says: "A deal moved to another stage." }],
  actions: [
    act(
      "crm.read",
      "Read deals, contacts and companies.",
      ["crm"],
      "on",
      false,
      arg("what", "text", true, "What to read: deals, contacts or companies."),
      arg("id", "text", false, "One record to read; a list if left out."),
    ),
    act(
      "crm.change_field",
      "Change a field of a deal; a person says yes first.",
      ["crm"],
      "ask",
      true,
      arg("deal", "text", true, "The deal to change."),
      arg("field", "text", true, "The field to change."),
      arg("value", "text", true, "What it becomes."),
    ),
    act(
      "crm.add_note",
      "Add a note to a deal.",
      ["crm"],
      "on",
      true,
      arg("deal", "text", true, "The deal to add it to."),
      arg("text", "text", true, "What the note says."),
    ),
    act(
      "crm.add_lead",
      "Add a new lead; a person says yes first.",
      ["crm"],
      "ask",
      true,
      arg("company", "text", true, "The company."),
      arg("name", "text", false, "Who to speak to there."),
      arg("notes", "text", false, "What is known so far."),
    ),
  ],
};

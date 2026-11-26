import type { Connector } from "../types.ts";
import { act, arg } from "./make.ts";

type Part = Pick<Connector, "id" | "name" | "setUp" | "events" | "actions" | "skills" | "view">;

export const email: Part = {
  id: "email",
  name: "Email",
  view: "mail",
  skills: ["email"],
  setUp: [
    { id: "add_address", by: "itself", says: "Make the address this workspace writes as." },
    { id: "point_dns", by: "person", says: "Add the DNS records at your domain so mail is proven to be ours." },
    { id: "check_delivery", by: "itself", says: "Send a test mail and check that it arrives." },
  ],
  events: [
    { id: "mail", says: "A mail came in to one of our addresses." },
    { id: "bounced", says: "A mail we sent came back undelivered." },
  ],
  actions: [
    act("email.search", "Search the mailbox for words.", ["mailbox"], "on", false, arg("words", "text", true, "The words to look for.")),
    act(
      "email.draft",
      "Write a draft that stays here until a person sends it.",
      ["from"],
      "on",
      false,
      arg("text", "text", true, "What the draft says."),
    ),
    act("email.reply", "Reply in the mail thread.", ["from", "thread"], "on", true, arg("text", "text", true, "What the reply says.")),
    act(
      "email.send_inside",
      "Send a mail to someone inside the workspace.",
      ["from"],
      "on",
      true,
      arg("to", "text", true, "The address to send to."),
      arg("subject", "text", true, "The subject."),
      arg("text", "text", true, "What the mail says."),
    ),
    act(
      "email.send_outside",
      "Send a mail to someone outside; a person says yes first.",
      ["from"],
      "ask",
      true,
      arg("to", "text", true, "The address to send to."),
      arg("subject", "text", true, "The subject."),
      arg("text", "text", true, "What the mail says."),
    ),
  ],
};

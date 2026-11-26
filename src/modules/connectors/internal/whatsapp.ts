import type { Connector } from "../types.ts";
import { act, arg } from "./make.ts";

type Part = Pick<Connector, "id" | "name" | "setUp" | "events" | "actions" | "skills" | "view">;

export const whatsapp: Part = {
  id: "whatsapp",
  name: "WhatsApp",
  view: "chat",
  skills: ["whatsapp"],
  setUp: [
    { id: "make_session", by: "itself", says: "Make a session for the phone to link to." },
    { id: "scan_code", by: "person", says: "Scan the code with the phone to link it." },
    { id: "check_phone", by: "itself", says: "Check that the phone is linked and online." },
  ],
  events: [
    { id: "message.received", says: "A message came in on the number." },
    { id: "message.edited", says: "Someone changed a message they sent." },
    { id: "message.reaction", says: "Someone reacted to a message." },
    { id: "message.failed", says: "A message we sent did not arrive." },
    { id: "session.status", says: "The phone was linked, unlinked or went offline." },
  ],
  actions: [
    act("whatsapp.read", "Read the chat.", ["number", "chat"], "on", false),
    act("whatsapp.reply", "Reply in the chat.", ["number", "chat"], "on", true, arg("text", "text", true, "What the reply says.")),
    act(
      "whatsapp.send_template",
      "Send an approved template, to start or restart a chat; a person says yes first.",
      ["number", "chat"],
      "ask",
      true,
      arg("template", "text", true, "The name of the template."),
      arg("values", "list", false, "What fills the template's blanks, in order."),
    ),
    act("whatsapp.typing", "Show that a reply is being written.", ["number", "chat"], "on", true),
  ],
};

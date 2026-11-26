import type { Kind, Step } from "~/modules/playbook/types.ts";

/* Sales: how the work goes (kinds, steps) and what sets it off (triggers). Drawn in design/src/sales.ts and design/src/screens/playbook/data.ts. */

export type Variant = "draft" | "live";

const MAIL = "juno@acme.co-worker.tech";
type Otherwise = Step["otherwise"];
const drop: Otherwise = { drop: "Say why" };
const step = (
  id: string,
  name: string,
  by: Step["by"],
  does: string,
  skills: readonly string[],
  leaves: string,
  checkedBy: Step["checkedBy"],
  otherwise: Otherwise,
  how: "agent" | "person" | "connector" | "command" = "agent",
): Step => ({ id, name, by, does, skills, leaves: [{ id: `${id}-ok`, says: leaves, by: how }], checkedBy, otherwise });

const STEPS = {
  look: step(
    "look",
    "Look it up",
    { agent: "researcher" },
    "Read the company’s site, its news and our CRM. Say whether it fits, with three facts.",
    ["company", "crm"],
    "Three facts, each with a source from the last 60 days",
    { code: true },
    drop,
  ),
  write: step(
    "write",
    "Write",
    { agent: "writer" },
    "One mail that uses one of the facts and asks one question.",
    ["short-mail", "bos-voice", "mail"],
    "Under 90 words, one question, names the fact",
    { agent: "reader" },
    { back: "look", times: 1, then: { drop: "Say why" } },
  ),
  read: step(
    "read",
    "Read it fresh",
    { agent: "reader" },
    "Compare the mail with the facts and with what we never say.",
    ["source"],
    "Nothing in it that is not in the facts",
    { code: true },
    { back: "write", times: 1, then: { ask: "bo" } },
  ),
  yes: step(
    "yes",
    "Bo says yes",
    { person: "bo" },
    "Only when they did not write to us first. Bo can change it; the change is kept as a case.",
    [],
    "Yes, or two days without an answer",
    { code: true },
    { drop: "A no is a case" },
    "person",
  ),
  add: step(
    "add",
    "Add a lead",
    { manager: true },
    "Put the company in the CRM as a lead, with the three facts and one person.",
    ["crm"],
    "Three facts, one person, not in the CRM yet",
    { code: true },
    drop,
    "connector",
  ),
  send: step(
    "send",
    "Send and follow",
    { manager: true },
    "Send it, note it in the CRM, answer what comes back, book the call.",
    ["mail", "calendar", "crm"],
    "A call is booked, or they said no, or the second reminder is three days old",
    { code: true },
    { ask: "bo" },
    "connector",
  ),
} as const;

const may = (account: string, place: string, allowed: Readonly<Record<string, "on" | "ask">>): Kind["may"][number] => ({
  account,
  place,
  may: allowed,
});
const READ_MAIL = may("email", MAIL, { "email.read": "on", "email.reply": "on", "email.draft": "on" });
const CRM_OWN = may("crm", "*", { "crm.read": "on", "crm.change_own": "on", "crm.add_note": "on" });

export function kinds(variant: Variant): readonly Kind[] {
  return [
    {
      id: "asked",
      name: "Someone asks",
      when: "They ask for a price, a demo, or whether we fit. Not support, not a supplier.",
      alone: "do",
      steps: [STEPS.look, STEPS.write, STEPS.read, STEPS.send],
      doneWhen: [{ id: "booked", says: "A call is booked, or they said no", by: "connector" }],
      may: [READ_MAIL, CRM_OWN, may("calendar", "bo", { "calendar.read": "on", "calendar.book": "on" })],
      limits: { perWork: 2, hours: 168, atOnce: 10 },
      look: "1d",
    },
    {
      id: "signal",
      name: "A sign at a company",
      when: "It opened a new site, or hired its first head of operations, in the last 30 days. Not raising money, not a single job advert.",
      alone: "ask",
      steps: [STEPS.look, STEPS.write, STEPS.read, STEPS.yes, STEPS.send],
      doneWhen: [{ id: "sent", says: "A mail that names the sign is sent, or it is dropped with the reason", by: "connector" }],
      may: [
        may("email", MAIL, { "email.read": "on", "email.draft": "on", "email.send_outside": "ask" }),
        may("crm", "*", { "crm.read": "on" }),
        may("web", "*", { "web.read": "on" }),
      ],
      limits: { perWork: 1, hours: 168, atOnce: 10 },
      look: "1d",
    },
    {
      id: "like",
      name: "A company like our best",
      when: "40 to 400 people, takes orders in two systems, in a country we sell to.",
      alone: "watch",
      steps: [STEPS.look, STEPS.add],
      doneWhen: [{ id: "lead", says: "A lead with three facts and a person", by: "connector" }],
      may: [may("crm", "*", { "crm.read": "on", "crm.add_lead": "ask" }), may("web", "*", { "web.read": "on" })],
      limits: { perWork: 1, hours: 72, atOnce: 5 },
      look: "7d",
    },
    {
      id: "quiet",
      name: "A lead that went quiet",
      when: "We wrote last, and three days passed. At most two reminders.",
      alone: variant === "draft" ? "ask" : "do",
      steps: [STEPS.write, STEPS.read, STEPS.send],
      doneWhen: [{ id: "answered", says: "They answered, or the second reminder is three days old", by: "connector" }],
      may: [may("email", MAIL, { "email.read": "on", "email.reply": "on" })],
      limits: { perWork: 0.2, hours: 168, atOnce: 10 },
      look: "1d",
    },
  ];
}

/** How many of 100 go on the first time, for each step: when it began, its aim, now. */
export const FIRST_TIME: Readonly<Record<string, { readonly first: number; readonly line: number; readonly now: number }>> = {
  look: { first: 88, line: 85, now: 94 },
  write: { first: 46, line: 70, now: 79 },
  read: { first: 91, line: 90, now: 96 },
  yes: { first: 73, line: 75, now: 86 },
  add: { first: 83, line: 80, now: 92 },
  send: { first: 81, line: 80, now: 88 },
};

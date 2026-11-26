import type { Kind, Step } from "~/modules/playbook/types.ts";
import type { Mandate } from "~/modules/reach/types.ts";
import type { TriggerRow } from "~/modules/views-manager/types.ts";
import { at } from "./read.ts";

/* Sales as it is read in Intake and on its trigger page: its four kinds and its six triggers. */

const step = (id: string, name: string, agent: string): Step => ({
  id,
  name,
  by: { agent },
  does: name,
  skills: [],
  leaves: [],
  checkedBy: { code: true },
  otherwise: { ask: "bo" },
});
const LOOK = step("look", "Look it up", "researcher");
const WRITE = step("write", "Write", "writer");
const READ = step("read", "Read it fresh", "reader");
const YES: Step = { ...step("yes", "Bo says yes", "bo"), by: { person: "bo" } };
const SEND = step("send", "Send and follow", "sales");

const kind = (
  id: string,
  name: string,
  when: string,
  alone: Kind["alone"],
  steps: readonly Step[],
  done: string,
  perWork: number,
): Kind => ({
  id,
  name,
  when,
  alone,
  steps,
  doneWhen: [{ id: `${id}-done`, says: done, by: "connector" }],
  may: [],
  limits: { perWork },
  look: "3d",
});

export const KINDS: readonly Kind[] = [
  kind(
    "asked",
    "Someone asks",
    "They ask for a price, a demo, or whether we fit. Not support, not a supplier.",
    "do",
    [LOOK, WRITE, READ, SEND],
    "A call is booked, or they said no",
    2,
  ),
  kind(
    "signal",
    "A sign at a company",
    "It opened a new site, or hired its first head of operations, in the last 30 days. Not raising money, not a single job advert.",
    "ask",
    [LOOK, WRITE, READ, YES, SEND],
    "A mail that names the sign is sent, or it is dropped with the reason",
    1,
  ),
  kind(
    "like",
    "A company like our best",
    "40 to 400 people, takes orders in two systems, in a country we sell to.",
    "watch",
    [LOOK],
    "A lead with three facts and a person",
    1,
  ),
  kind(
    "quiet",
    "A lead that went quiet",
    "We wrote last, and three days passed. At most two reminders.",
    "do",
    [WRITE, READ, SEND],
    "They answered, or the second reminder is three days old",
    0.2,
  ),
];

const ZONE = "Europe/Copenhagen";
const base = { on: true, atMost: "no limit" } as const;

export const TRIGGERS: readonly TriggerRow[] = [
  {
    trigger: {
      ...base,
      id: "mail",
      name: "Mail about buying",
      by: "event",
      account: "email",
      place: "juno@acme.co-worker.tech",
      events: ["mail.received"],
      makes: { kind: "asked" },
      only: "Mail to Juno that is about buying. Other mail goes to Support.",
    },
    came: 14,
    took: 13,
    cost: 3,
    next: null,
    from: "juno@acme.co-worker.tech",
  },
  {
    trigger: {
      ...base,
      id: "deals",
      name: "A deal moves in the CRM",
      by: "event",
      account: "crm",
      place: "*",
      events: ["deal.moved"],
      makes: "tells",
      only: "Stage, owner, or close date changed",
    },
    came: 9,
    took: 9,
    cost: 1,
    next: null,
    from: "Acme’s CRM, all deals",
  },
  {
    trigger: {
      id: "signs",
      name: "Look for signs",
      on: true,
      atMost: { a: "day", count: 10 },
      by: "cron",
      when: { cron: "30 8 * * 1-5", zone: ZONE },
      agent: "researcher",
      brief:
        "A company on the list that opened a new site, or hired its first head of operations, in the last 30 days. Say where you read it. A single job advert is not a sign, and neither is raising money. If you cannot find the date, leave it out.",
      finds: ["Company", "sign", "date", "the page it was read on"],
      same: ["Same company and same sign", "within 60 days"],
      makes: { kind: "signal" },
      only: "CRM list “Target accounts”, read fresh each time",
    },
    came: 6,
    took: 4,
    cost: 3,
    next: at("26 Nov 08:30"),
    from: "Researcher, 140 target accounts",
  },
  {
    trigger: {
      id: "like",
      name: "Find companies like our best",
      on: true,
      atMost: { a: "week", count: 5 },
      by: "cron",
      when: { cron: "0 6 * * 1", zone: ZONE },
      agent: "researcher",
      brief: "Look at the 12 best customers of the last year, then at companies like them: size, two order systems, a country we sell to.",
      finds: ["Company", "size", "systems", "country"],
      same: ["Same company, ever"],
      makes: { kind: "like" },
      only: "The 12 best customers of the last year",
    },
    came: 5,
    took: 0,
    cost: 2,
    next: at("30 Nov 06:00"),
    from: "Researcher, from 12 best customers",
  },
  {
    trigger: {
      ...base,
      id: "quiet",
      name: "No answer for three days",
      by: "wait",
      for: "72h",
      of: "mail.sent",
      holds: "no answer",
      account: "email",
      makes: { kind: "quiet" },
      only: "We wrote last, and 72 hours passed. Not when they are away, or Bo took it over.",
    },
    came: 5,
    took: 5,
    cost: 1,
    next: null,
    from: "Leads we wrote to last",
  },
  {
    trigger: {
      ...base,
      id: "people",
      name: "Asked by the team",
      by: "asked",
      where: "Here, Slack #sales",
      makes: { kinds: "any" },
      only: "Ama and Bo, here or in Slack #sales",
    },
    came: 2,
    took: 2,
    cost: 0,
    next: null,
    from: "Here, Slack #sales",
  },
];

export const trigger = (id: string): TriggerRow => {
  const found = TRIGGERS.find((row) => row.trigger.id === id);
  if (found === undefined) throw new Error(`No trigger ${id}`);
  return found;
};

/** What a kind may do, as a mandate under version `version`, for the work it made. */
export function mandate(
  version: number,
  because: Mandate["because"],
  strength: Mandate["strength"],
  may: Mandate["grants"],
  perWork: number,
  until: string,
): Mandate {
  return { grants: may, limits: { perWork }, strength, because, version, until: at(`${until} 12:00`), state: "holds" };
}

import type { Trigger } from "~/modules/playbook/types.ts";
import type { Variant } from "./sales-work.ts";

const MAIL = "juno@acme.co-worker.tech";

/* What sets Sales off, as drawn in design/src/screens/playbook/data.ts: its six triggers, and what each brought in. */

export interface TriggerFacts {
  readonly trigger: Trigger;
  readonly says: string;
  readonly most: string;
  /** In 7 days, and on the past work of the draft: came, became work, dollars. */
  readonly week: readonly [number, number, number];
  readonly past: readonly [number, number, number];
  readonly from: string;
}

const base = { on: true } as const;
export function triggers(variant: Variant): readonly TriggerFacts[] {
  const signs = variant === "draft" ? "0 7 * * 1-5" : "30 8 * * 1-5";
  return [
    {
      trigger: {
        ...base,
        id: "signs",
        name: "Look for signs",
        makes: { kind: "signal" },
        only: "Something changed there since the last time",
        atMost: { a: "day", count: 10 },
        by: "cron",
        when: { cron: signs, zone: "Europe/Copenhagen" },
        agent: "researcher",
        brief: "Read the 140 target accounts for a new site, or a first head of operations",
        finds: ["A new site", "A first head of operations"],
        same: ["Same company and same sign within 60 days"],
      },
      says: "Researcher reads the 140 target accounts for a new site, or a first head of operations",
      most: "10 a day",
      week: [6, 4, 3],
      past: [22, 19, 13],
      from: "Researcher, 140 target accounts",
    },
    {
      trigger: {
        ...base,
        id: "like",
        name: "Find companies like our best",
        makes: { kind: "like" },
        only: "Fewer than 5 are waiting to be judged",
        atMost: { a: "week", count: 5 },
        by: "cron",
        when: { cron: "0 6 * * 1", zone: "Europe/Copenhagen" },
        agent: "researcher",
        brief: "Look for companies like the 12 best customers of the last year",
        finds: ["Size, two order systems, a country we sell to"],
        same: ["Same company, ever"],
      },
      says: "Researcher looks for companies like the 12 best customers of the last year",
      most: "5 a week",
      week: [5, 0, 2],
      past: [18, 9, 8],
      from: "Researcher, from 12 best customers",
    },
    {
      trigger: {
        ...base,
        id: "mail",
        name: "Mail about buying",
        makes: { kind: "asked" },
        only: "Really from who it says. Not bulk mail",
        atMost: "no limit",
        by: "event",
        account: "email",
        place: MAIL,
        events: ["mail.received"],
      },
      says: "Anyone who writes to juno@ about buying",
      most: "No limit",
      week: [14, 13, 3],
      past: [96, 56, 12],
      from: MAIL,
    },
    {
      trigger: {
        ...base,
        id: "deals",
        name: "A deal moves in the CRM",
        makes: "tells",
        only: "Not its own changes",
        atMost: "no limit",
        by: "event",
        account: "crm",
        place: "*",
        events: ["deal.moved"],
      },
      says: "Tells the work that is open on it. Starts nothing",
      most: "No limit",
      week: [9, 9, 1],
      past: [31, 31, 1],
      from: "Acme’s CRM, all deals",
    },
    {
      trigger: {
        ...base,
        id: "quiet",
        name: "No answer for three days",
        makes: { kind: "quiet" },
        only: "They are not away, and Bo has not taken over",
        atMost: "no limit",
        by: "wait",
        for: "72h",
        of: "A mail we wrote last",
        holds: "We wrote last. Writer sends one short reminder",
        account: "email",
      },
      says: "We wrote last. Writer sends one short reminder",
      most: "Twice, then never again",
      week: [5, 5, 1],
      past: [22, 22, 1],
      from: "Leads we wrote to last",
    },
    {
      trigger: {
        ...base,
        id: "people",
        name: "Asked by the team",
        makes: { kinds: "any" },
        only: "Others in #sales are heard, never acted on",
        atMost: "no limit",
        by: "asked",
        where: "chat, Slack #sales",
      },
      says: "Ama or Bo says so, here or in Slack #sales",
      most: "No limit",
      week: [2, 2, 0],
      past: [7, 7, 1],
      from: "Here, Slack #sales",
    },
  ];
}

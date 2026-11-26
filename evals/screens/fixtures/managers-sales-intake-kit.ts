import type { Decision as Whole, Item, Verdict } from "~/modules/intake/types.ts";
import type { Grant } from "~/modules/reach/types.ts";
import type { IntakeRow } from "~/modules/views-manager/types.ts";
import { TRIGGERS } from "./managers-sales-kit.ts";
import { at } from "./read.ts";

/* Sales' Intake, as drawn: the latest 13 of 41 in 7 days, each with what was decided and why. */

export const ASKED: readonly Grant[] = [
  { account: "email", place: "*", may: { "mail.reply": "on" } },
  { account: "prices", place: "*", may: { "prices.read": "on" } },
  { account: "calendar", place: "bo", may: { "calendar.book": "on" } },
];
export const SIGN: readonly Grant[] = [
  { account: "crm", place: "*", may: { "crm.read": "on" } },
  { account: "web", place: "*", may: { "web.read": "on" } },
  { account: "email", place: "*", may: { "mail.draft": "on", "mail.send": "ask" } },
];
export const QUIET: readonly Grant[] = [{ account: "email", place: "*", may: { "mail.reply": "on" } }];
export const READ_ONLY: readonly Grant[] = [
  { account: "crm", place: "*", may: { "crm.read": "on" } },
  { account: "email", place: "*", may: { "mail.reply": "on" } },
];
export const BO_MAIL: readonly Grant[] = [
  { account: "crm", place: "*", may: { "crm.read": "on" } },
  { account: "email", place: "*", may: { "mail.send": "on" } },
];

export type Decision = Whole extends infer D ? (D extends unknown ? Omit<D, "item"> : never) : never;
export const no = (kind: string, why: string): Verdict => ({ manager: "sales", kind, is: false, why, fit: 0.1 });
export const yes = (kind: string, why: string): Verdict => ({ manager: "sales", kind, is: true, why, fit: 0.9 });
export const OWN = "From a trigger of this manager’s";
export const gate = (why: string, let_: "asked" | "maybe" | "no" = "asked"): Whole["gated"] => [
  { manager: "sales", gated: { let: let_, why } },
];

export interface Seed {
  readonly id: string;
  readonly title: string;
  readonly trigger: string;
  readonly by: Item["by"];
  readonly actor: Item["actor"];
  readonly when: string;
  readonly thread: string;
  readonly decision: Decision;
  readonly work?: { readonly id: string; readonly title: string };
  readonly line: readonly (readonly [string, string, string])[];
  readonly mandate?: IntakeRow["mandate"];
}

const feed = (id: string): string => TRIGGERS.find((row) => row.trigger.id === id)?.trigger.name ?? id;
const researcher: Item["actor"] = { address: "manager:researcher", name: "Researcher", bot: true };
export const person = (name: string, address: string): Item["actor"] => ({ address: `mail:${address}`, name, bot: false });

export function row(seed: Seed): IntakeRow {
  const when = at(seed.when);
  const item: Item = {
    id: seed.id,
    trigger: seed.trigger,
    by: seed.by,
    account: seed.trigger === "people" ? "slack" : "email",
    place: "*",
    thread: seed.thread,
    event: seed.by === "cron" ? "search.found" : "mail.received",
    actor: seed.actor,
    addressed: seed.by !== "cron",
    at: when,
    title: seed.title,
    text: seed.title,
    same: `${seed.trigger}:${seed.id}`,
  };
  return {
    item,
    decision: { item: seed.id, ...seed.decision } as Whole,
    work: seed.work ?? null,
    from: feed(seed.trigger),
    line: seed.line.map(([did, says, time]) => ({ did, says, at: at(`${seed.when.split(" ").slice(0, 2).join(" ")} ${time}`) })),
    said: null,
    versions: { sales: 6 },
    mandate: seed.mandate ?? null,
  };
}

export const sign = (
  id: string,
  title: string,
  when: string,
  state: Decision["_tag"],
  line: Seed["line"],
  more: Partial<Seed> = {},
): Seed => ({
  id,
  title,
  trigger: "signs",
  by: "cron",
  actor: researcher,
  when,
  thread: `web:${id}`,
  decision: { _tag: state, gated: gate(OWN), verdicts: [], why: "" } as Seed["decision"],
  line,
  ...more,
});

export const like = (id: string, title: string, why: string): Seed => ({
  id,
  title,
  trigger: "like",
  by: "cron",
  actor: researcher,
  when: "23 Nov 06:12",
  thread: `web:${id}`,
  decision: {
    _tag: "Left",
    would: { manager: "sales", kind: "like" },
    gated: gate(OWN),
    verdicts: [yes("like", why)],
    why: "Would have added a lead",
  },
  line: [
    ["Found", "Find companies like our best", "06:12"],
    ["Judged", "Matches one kind", "06:13"],
    ["Watched", "Nothing was done", "06:13"],
  ],
});

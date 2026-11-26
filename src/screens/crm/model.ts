import type { Clock } from "~/modules/page/types.ts";
import type { Deal, DealsView } from "~/modules/views-connector/types.ts";
import { isToday, whenOf } from "../connectors/when.ts";

export type Tone = "neutral" | "blue" | "purple" | "orange" | "green" | "red";
/** How each stage looks: the console gives the stages in order, and the page colours the ones it knows. */
const TONES: Readonly<Record<string, Tone>> = {
  new: "neutral",
  talking: "blue",
  meeting: "purple",
  offer: "orange",
  won: "green",
  lost: "red",
};

/** One deal as the list draws it. */
export interface Row extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly company: string;
  readonly stage: string;
  readonly stageName: string;
  readonly tone: Tone;
  readonly value: number;
  readonly owner: string;
  readonly work: string | null;
  readonly says: string;
  readonly by: string;
  readonly when: string;
  readonly stamp: number;
  readonly waiting: boolean;
  readonly changedToday: boolean;
}

export const rowOf = (deal: Deal, view: DealsView, clock: Clock, zone: string): Row => ({
  id: deal.id,
  name: deal.name,
  company: deal.company,
  stage: deal.stage,
  stageName: view.stages.find((s) => s.id === deal.stage)?.name ?? deal.stage,
  tone: TONES[deal.stage] ?? "neutral",
  value: deal.amount,
  owner: deal.owner,
  work: deal.work,
  says: deal.changed.says,
  by: deal.changed.by,
  when: whenOf(deal.changed.at, clock, zone),
  stamp: deal.changed.at,
  waiting: deal.waits,
  changedToday: deal.changed.by === "Sales" && isToday(deal.changed.at, clock, zone),
});

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const money = (n: number): string => usd.format(n);

export type Scope = "all" | "today" | "waiting" | "person" | "won" | "lost";
export const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Changed by Sales today" },
  { value: "waiting", label: "Waiting for us" },
  { value: "person", label: "With a person" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];
export const inScope = (d: Row, s: Scope): boolean => {
  switch (s) {
    case "all":
      return true;
    case "today":
      return d.changedToday;
    case "waiting":
      return d.waiting;
    case "person":
      return d.owner !== "Sales";
    case "won":
      return d.stage === "won";
    case "lost":
      return d.stage === "lost";
  }
};

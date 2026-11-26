/** The customer's CRM as it stands: what is in it, and what Sales may do there. Names and numbers agree with ../../world.ts. */
export type StageId = "new" | "talking" | "meeting" | "offer" | "won" | "lost";
export type Tone = "neutral" | "blue" | "purple" | "orange" | "green" | "red";
export const STAGES: Readonly<Record<StageId, { label: string; tone: Tone }>> = {
  new: { label: "New", tone: "neutral" },
  talking: { label: "Talking", tone: "blue" },
  meeting: { label: "Meeting booked", tone: "purple" },
  offer: { label: "Offer sent", tone: "orange" },
  won: { label: "Won", tone: "green" },
  lost: { label: "Lost", tone: "red" },
};
export const STAGE_IDS = Object.keys(STAGES) as StageId[];

export interface Mail { subject: string; body: string }
/** Something that came in (`in`) or went out (`out`) of the CRM, done by a person, the CRM or Sales. */
export interface Entry { kind: "entry"; id: string; at: string; who: string; dir: "in" | "out"; text: string; became?: string; mail?: Mail; note?: string }
/** What you told Sales about this deal: the CRM does not see it. */
export interface Told { kind: "told"; id: string; at: string; text: string }
export type Ev = Entry | Told;
export interface Person { name: string; role: string; email: string }
export interface Note { by: string; at: string; text: string }

export interface DealFields {
  id: string; name: string; company: string; stage: StageId;
  seats: number; perSeat: number; setup: number;
  owner: string; work: string | null;
  source: string; closeBy: string; site: string; size: string; city: string;
  people: Person[];
}
export interface Deal extends DealFields, Record<string, unknown> {
  /** Sales has not answered yet: it is our turn. */
  waiting: boolean;
  /** A stage Sales asks to move this to. It waits for a yes. */
  pending: StageId | null;
  notes: Note[]; events: Ev[];
}
export interface Row extends Deal { value: number; stamp: number }

export const TODAY = "25 Nov";
export const NOW = "25 Nov, 09:54";
/** The facts the sample story states about Sales: world.ts has 12 / 12 calls, 21 open, 1 waiting on a person. */
export const IN_THE_CRM = 41;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const money = (n: number): string => usd.format(n);
export const valueOf = (d: Deal): number => d.seats * d.perSeat + d.setup;
export const stampOf = (at: string): number => {
  const m = /^(\d+) \w+, (\d+):(\d+)$/.exec(at);
  return m ? Number(m[1]) * 1440 + Number(m[2]) * 60 + Number(m[3]) : 0;
};
export const isToday = (at: string): boolean => at.startsWith(TODAY);
/** 24 hour time; the day only when it is not today. */
export const whenOf = (at: string): string => (isToday(at) ? at.slice(TODAY.length + 2) : at);
export const entries = (d: Deal): Entry[] => d.events.filter((e): e is Entry => e.kind === "entry");
export const lastOf = (d: Deal): Entry => entries(d).at(-1) as Entry;
export const toRow = (d: Deal): Row => ({ ...d, value: valueOf(d), stamp: stampOf(lastOf(d).at) });
export const bySales = (d: Deal): boolean => lastOf(d).who === "Sales";

export type Scope = "all" | "today" | "waiting" | "person" | "won" | "lost";
export const SCOPES: { value: Scope; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Changed by Sales today" },
  { value: "waiting", label: "Waiting for us" },
  { value: "person", label: "With a person" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];
export const inScope = (d: Deal, s: Scope): boolean => {
  switch (s) {
    case "all": return true;
    case "today": return bySales(d) && isToday(lastOf(d).at);
    case "waiting": return d.waiting;
    case "person": return d.owner !== "Sales";
    case "won": return d.stage === "won";
    case "lost": return d.stage === "lost";
  }
};

/** What Sales may do in this CRM. */
export const MAY = [
  { label: "Read deals", level: "On" },
  { label: "Write a note", level: "On" },
  { label: "Move a stage", level: "Ask first" },
  { label: "Delete a deal", level: "Off" },
] as const;

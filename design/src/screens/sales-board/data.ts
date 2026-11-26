import { CheckCircleIcon, DocumentTextIcon, EyeIcon, MagnifyingGlassIcon, PaperAirplaneIcon, UserIcon } from "@heroicons/react/24/outline";

/** Sales' own steps, which its workflow decided: the board's columns. */
export type ColumnId = "look" | "write" | "read" | "yes" | "send" | "done";
export type Waits = "customer" | "bo";
export type Kind = "Someone asks" | "A sign at a company" | "A company like our best" | "A lead that went quiet";

export interface ColumnMeta {
  id: ColumnId; title: string; variant: "neutral" | "warning";
  /** Pieces of work in this step that are not drawn as cards. */
  more: number;
  emptyTitle: string; emptyDescription: string; emptyIcon: typeof UserIcon;
}

/** A piece of work as a card. `next`: what moves it on. `who`: who has it now. */
export interface Item { id: string; company: string; about: string; step: ColumnId; kind: Kind; next: string; who: string; waits?: Waits; thread?: boolean }

export const COLUMNS: ColumnMeta[] = [
  { id: "look", title: "Look it up", more: 2, emptyTitle: "Nothing to look up", emptyDescription: "New work lands here first.", emptyIcon: MagnifyingGlassIcon },
  { id: "write", title: "Write", more: 1, emptyTitle: "Nothing to write", emptyDescription: "Work with a finished look-up waits here.", emptyIcon: DocumentTextIcon },
  { id: "read", title: "Read it fresh", more: 0, emptyTitle: "Nothing to read", emptyDescription: "Written mail waits here for a fresh look.", emptyIcon: EyeIcon },
  { id: "yes", title: "Bo says yes", more: 0, variant: "warning", emptyTitle: "Nothing waits for Bo", emptyDescription: "Mail that needs a yes waits here.", emptyIcon: UserIcon },
  { id: "send", title: "Send and follow", more: 7, emptyTitle: "Nothing sent", emptyDescription: "Sent mail waits here for an answer.", emptyIcon: PaperAirplaneIcon },
  { id: "done", title: "Done", more: 9, emptyTitle: "Nothing done yet", emptyDescription: "Finished work appears here.", emptyIcon: CheckCircleIcon },
].map((c) => ({ variant: "neutral" as const, ...c }));

export const ITEMS: Item[] = [
  { id: "SALES-31", company: "Fernhill Dental", about: "Asked for a price for 10 seats, at 08:47.", step: "look", kind: "Someone asks", next: "The practice and the price", who: "Researcher", thread: true },
  { id: "SALES-33", company: "Lindqvist Paper", about: "A new head of operations, since 17 Nov.", step: "look", kind: "A sign at a company", next: "Who they are, and what they run", who: "Researcher" },
  { id: "SALES-19", company: "Quarry & Co", about: "Declan Shaw asks if it reads from two systems.", step: "write", kind: "Someone asks", next: "A mail that answers both questions", who: "Writer", thread: true },
  { id: "SALES-32", company: "Brightside", about: "Bo asked for a mail about spring.", step: "write", kind: "Someone asks", next: "A first draft", who: "Writer" },
  { id: "SALES-26", company: "Abbot Glass", about: "A new head of operations, since 9 Nov.", step: "read", kind: "A sign at a company", next: "A fresh read of the mail", who: "Reader" },
  { id: "SALES-27", company: "Tern Hotels", about: "Opened two sites on 12 Nov.", step: "read", kind: "A sign at a company", next: "A fresh read of the mail", who: "Reader" },
  { id: "SALES-34", company: "Harbor Foods", about: "Opened a site in Ghent on 19 Nov.", step: "yes", kind: "A sign at a company", next: "Bo’s yes on the mail", who: "Bo", waits: "bo" },
  { id: "SALES-24", company: "Northwind", about: "Pat Reyes. Thursday at 14:00, 25 seats.", step: "send", kind: "Someone asks", next: "Pat confirms the time", who: "Pat Reyes", waits: "customer" },
  { id: "SALES-22", company: "Lumen Studio", about: "Offer for 8 seats, which stands until 28 Nov.", step: "send", kind: "Someone asks", next: "Inês Costa answers the offer", who: "Inês Costa", waits: "customer" },
  { id: "SALES-28", company: "Harbor Logistics", about: "Joris Dekker wants the price in writing before Friday.", step: "send", kind: "Someone asks", next: "Joris answers the price", who: "Joris Dekker", waits: "customer" },
  { id: "SALES-30", company: "Tidewater Foods", about: "No answer for three days. Reminded at 08:02.", step: "send", kind: "A lead that went quiet", next: "Gwen answers, or a last reminder on 28 Nov", who: "Gwen Pryce", waits: "customer" },
  { id: "SALES-14", company: "Alder Finance", about: "Won: 30 seats, a year.", step: "done", kind: "Someone asks", next: "Nothing", who: "Bo" },
  { id: "SALES-15", company: "Kestrel Air", about: "Won: 12 seats.", step: "done", kind: "Someone asks", next: "Nothing", who: "Ama" },
  { id: "SALES-16", company: "Copperline Energy", about: "Said no, and why: too small a fit.", step: "done", kind: "Someone asks", next: "Nothing", who: "Sales" },
];

/** What the board says about itself, so the line at the top and the cards cannot disagree. */
export const OPEN_TOTAL = 21;
export const WAIT_CUSTOMER = 9;
export const WAIT_BO = 1;
export const stepName = (id: ColumnId): string => COLUMNS.find((c) => c.id === id)?.title ?? id;
export const DRAG_THRESHOLD = 5;

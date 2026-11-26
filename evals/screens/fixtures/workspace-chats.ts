import type { Chat } from "~/modules/coworker/types.ts";
import { at } from "./read.ts";

/* Every conversation anybody has with the co-worker. A fork is under the one it was forked from. */
const chat = (
  id: string,
  title: string,
  who: string,
  where: string,
  last: string,
  state: Chat["state"],
  more: Partial<Chat> = {},
): Chat => ({
  id,
  title,
  with: who,
  where,
  last: at(last),
  state,
  waitsFor: null,
  under: null,
  knew: null,
  ...more,
});

export const SETUP = chat("setup", "More good calls", "Ama Mensah", "Here", "5 Oct 16:20", "quiet");
export const SUPPORT = chat("support", "Why is Support slower?", "Ama Mensah", "Here", "25 Nov 09:31", "quiet");
export const OCTOBER = chat("october", "Compare with October", "Ama Mensah", "Here", "25 Nov 09:46", "working", {
  under: "support",
  knew: 6,
});
export const NOTE = chat("note", "Draft the note to the team", "Ama Mensah", "Here", "25 Nov 09:20", "quiet", {
  under: "support",
  knew: 2,
});
export const V23 = chat("v23", "v2.3 without the 150k fix", "Bo Larsen", "Slack, #releases", "25 Nov 09:05", "waits", { waitsFor: "Bo" });
export const V23_TOLD = chat("v23-told", "What customers were told", "Bo Larsen", "Slack, #releases", "25 Nov 08:52", "quiet", {
  under: "v23",
  knew: 11,
});
export const MONDAY = chat("monday", "Monday export is short", "Pat Reyes, Northwind", "Mail", "24 Nov 17:40", "waits", {
  waitsFor: "Ama",
});
export const REVIEW = chat("review-418", "Review of #418", "Chidi Okafor", "GitHub, acme/web #418", "25 Nov 09:54", "working");
export const ORDER = chat("order", "Is my order on its way?", "Lena Fischer", "WhatsApp", "25 Nov 08:02", "quiet");

/** In the order they are listed: each, then what was forked from it. */
export const CHATS: readonly Chat[] = [SETUP, SUPPORT, OCTOBER, NOTE, V23, V23_TOLD, MONDAY, REVIEW, ORDER];
/** The viewer's own, for the sidebar. */
export const MINE: readonly Chat[] = [SETUP, SUPPORT, OCTOBER, NOTE];

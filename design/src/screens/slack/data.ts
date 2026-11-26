import type { Line } from "../whatsapp/types";

export type ThreadState = "working" | "answered" | "asks";
/** A thread is its own agent, forked from a message. `sub` are threads it started itself. */
/** A thread that a thread started, to any depth. */
export interface Fork { readonly name: string; readonly to?: string; readonly sub?: readonly Fork[] }
export interface Thread {
  readonly id: string; readonly conv: string; readonly root: string; readonly name: string; readonly state: ThreadState;
  readonly replies: readonly Line[]; readonly forkedAt: string; readonly waits?: boolean;
  readonly work?: { readonly id: string; readonly to: string }; readonly how?: boolean;
  readonly sub?: readonly Fork[];
}
export interface Conversation { readonly id: string; readonly kind: "channel" | "dm"; readonly name: string; readonly topic: string; readonly unread: number; readonly lines: readonly Line[] }

const m = (id: string, time: string, name: string, text: string, thread?: string): Line =>
  ({ kind: "msg", id, side: "them", time, name, text, ...(thread ? { thread } : {}) }) as Line;
const c = (id: string, time: string, text: string): Line => ({ kind: "msg", id, side: "me", time, text, by: "Juno" });
const day = (id: string, text: string): Line => ({ kind: "note", id, text });

export const CONVERSATIONS: readonly Conversation[] = [
  { id: "engineering", kind: "channel", name: "engineering", topic: "Code, reviews and what is being built", unread: 0, lines: [
    day("d1", "24 Nov"),
    m("e1", "08:31", "Bo Larsen", "Morning. CI was slow overnight, the runners were busy."),
    m("e2", "08:33", "Chidi Okafor", "Same here. I reran twice."),
    m("e3", "08:40", "Bo Larsen", "Looks like the cache key changed. I am looking."),
    m("e4", "08:52", "Bo Larsen", "Fixed. The cache is warm again."),
    m("e5", "08:53", "Chidi Okafor", "Thanks."),
    m("e6", "08:58", "Chidi Okafor", "Heads up: the review of the rate limit is mine today."),
    m("e7", "09:01", "Bo Larsen", "Okay. I will stay out of that branch."),
    m("e8", "09:03", "Chidi Okafor", "Northwind wrote in again about their Monday export."),
    m("e9", "09:05", "Chidi Okafor", "It finishes without an error but the file is short."),
    m("e10", "09:07", "Bo Larsen", "212,000 rows, they said. Cut off near 150,000."),
    m("e11", "09:09", "Bo Larsen", "That smells like memory."),
    m("e12", "09:10", "Chidi Okafor", "Same. It is issue #412 on GitHub."),
    m("e13", "09:12", "Chidi Okafor", "@Juno can you take #412? Northwind exports every Monday.", "t-export"),
    m("e14", "11:30", "Bo Larsen", "Deploy window today is 16:00."),
    day("d2", "25 Nov"),
    m("e15", "09:20", "Bo Larsen", "Standup at 10:00."),
  ] },
  { id: "support-bugs", kind: "channel", name: "support-bugs", topic: "Bugs customers ran into", unread: 3, lines: [
    m("b1", "09:02", "Chidi Okafor", "Two people say sign in with GitHub loops on Safari. Issue #421."),
    m("b2", "09:10", "Bo Larsen", "I can reproduce on Safari 17."),
    m("b3", "09:30", "Bo Larsen", "@Juno is the keyboard order in the sidebar fixed?", "t-sidebar"),
  ] },
  { id: "releases", kind: "channel", name: "releases", topic: "What goes out, and when", unread: 1, lines: [
    day("d3", "24 Nov"),
    m("r1", "13:50", "Bo Larsen", "v2.3 is planned for 26 November."),
    m("r2", "14:05", "Chidi Okafor", "The 150k export fix has to be in it."),
    m("r3", "14:20", "Chidi Okafor", "@Juno should we drop Node 18 in this release?", "t-node"),
  ] },
  { id: "dm-chidi", kind: "dm", name: "Chidi Okafor", topic: "Direct message", unread: 2, lines: [
    m("c1", "09:36", "Chidi Okafor", "@Juno what is left on the rate limit?", "t-rate"),
    m("c2", "09:41", "Chidi Okafor", "@Juno is v2.3 still on for Thursday?", "t-v23"),
  ] },
  { id: "dm-bo", kind: "dm", name: "Bo Larsen", topic: "Direct message", unread: 0, lines: [
    m("o1", "09:18", "Bo Larsen", "@Juno can you rerun CI on #416?", "t-ci"),
  ] },
];

export const THREADS: readonly Thread[] = [
  { id: "t-export", conv: "engineering", root: "e13", name: "Northwind export is short", state: "working", forkedAt: "09:12", work: { id: "ACME-412", to: "task" }, how: true, sub: [{ name: "Find the cause", sub: [{ name: "Write the fix", sub: [{ name: "Answer the review", to: "thread" }] }] }, { name: "Check it, fresh" }], replies: [
    c("x1", "09:12", "Taking it as ACME-412. Done means: an export of 212,000 rows has every row, memory stays under 128 MB, and the docs stop naming a limit."),
    m("x2", "09:15", "Chidi Okafor", "Good. Ask me for the review when the pull request is up."),
    c("x3", "10:56", "Pull request #418 is up. Chidi, it is ready for your review."),
  ] },
  { id: "t-sidebar", conv: "support-bugs", root: "b3", name: "Sidebar keyboard order", state: "answered", forkedAt: "09:30", replies: [
    c("s1", "09:30", "Not yet. The fix is in #416 and waits for CI. It goes out with v2.3."),
  ] },
  { id: "t-node", conv: "releases", root: "r3", name: "Drop Node 18?", state: "asks", waits: true, forkedAt: "14:20", work: { id: "ACME-398", to: "m-coding-board" }, replies: [
    m("n1", "14:24", "Bo Larsen", "No. One customer still builds on it."),
    m("n2", "14:26", "Chidi Okafor", "They can move. It is end of life."),
    c("n3", "14:27", "You two disagree and I should not pick. Who decides: merge it now, or wait for v3?"),
  ] },
  { id: "t-rate", conv: "dm-chidi", root: "c1", name: "Rate limit on the API", state: "asks", waits: true, forkedAt: "09:36", work: { id: "ACME-404", to: "m-coding-board" }, replies: [
    c("q1", "09:37", "Your review of #413. You asked twice about the limit per key, and I have answered both."),
  ] },
  { id: "t-v23", conv: "dm-chidi", root: "c2", name: "Is v2.3 still on?", state: "answered", forkedAt: "09:41", replies: [
    c("v1", "09:41", "Yes, for 26 November. It waits on the 150k fix."),
  ] },
  { id: "t-ci", conv: "dm-bo", root: "o1", name: "Rerun CI on #416", state: "answered", forkedAt: "09:18", replies: [
    c("i1", "09:18", "Done. It is running now."),
  ] },
];

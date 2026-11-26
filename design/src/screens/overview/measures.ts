/* What each manager is there to get to, and the numbers that say so. Every one is read where the manager cannot write, or said by a person. */

export interface Measure {
  readonly id: string; readonly name: string; readonly value: string; readonly before: string; readonly aim: string;
  /** What is counted, in words, and where it is read. */
  readonly counts: string; readonly read: string;
  readonly isDown?: boolean; readonly state: "good" | "behind" | "not yet"; readonly spark: readonly number[];
  readonly isGuard?: boolean;
}
export interface Brought { readonly name: string; readonly values: readonly number[] }
export interface Lost { readonly id: string; readonly label: string; readonly about: string; readonly n: string; readonly change?: string }
export interface Objective {
  readonly said: string; readonly text: string; readonly who: string; readonly state: string; readonly isBehind: boolean;
  readonly weeks: readonly string[]; readonly result: readonly number[]; readonly line: readonly (number | null)[]; readonly unit: string; readonly note: string;
  readonly brought: readonly Brought[]; readonly measures: readonly Measure[]; readonly lost: readonly Lost[];
}

const SALES_WEEKS = ["9 Sep", "16 Sep", "23 Sep", "30 Sep", "7 Oct", "14 Oct", "21 Oct", "28 Oct", "4 Nov", "11 Nov", "18 Nov", "25 Nov"];
const CODING_WEEKS = ["26 Aug", "2 Sep", "9 Sep", "16 Sep", "23 Sep", "30 Sep", "7 Oct", "14 Oct", "21 Oct", "28 Oct", "4 Nov", "11 Nov"];
/** The straight line from where it was to where it should be. Nothing before the manager was there. */
const lineTo = (n: number, start: number, from: number, to: number, over: number): (number | null)[] =>
  Array.from({ length: n }, (_, i) => (i < start ? null : Number((from + ((to - from) * (i - start)) / over).toFixed(1))));

export const OBJECTIVES: Readonly<Record<string, Objective>> = {
  sales: {
    said: "I want more good calls. Bo loses leads because nobody follows up, and we hear too late when a company changes. Twelve a week by new year, and not at the cost of Bo’s day.",
    text: "12 good calls a week by 31 December", who: "Ama Mensah, 5 Oct", state: "On its line", isBehind: false,
    weeks: SALES_WEEKS, result: [5, 4, 6, 5, 5, 5, 6, 7, 8, 8, 8, 9], line: lineTo(12, 4, 5, 12, 12), unit: "Good calls",
    note: "Set by Bo in the CRM after each call",
    brought: [
      { name: "Someone asked", values: [4, 4, 5, 4, 4, 4, 4, 4, 5, 4, 4, 4] },
      { name: "A sign at a company", values: [1, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4] },
      { name: "A lead that went quiet", values: [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1] },
    ],
    measures: [
      { id: "calls", name: "Good calls a week", value: "9", before: "5", aim: "12 by 31 Dec", counts: "Took place, with a company that fits", read: "CRM, set by Bo after the call", state: "good", spark: [5, 4, 6, 5, 5, 5, 6, 7, 8, 8, 8, 9] },
      { id: "won", name: "Won from those calls", value: "Not yet", before: "4 a month", aim: "8 a month", counts: "Deals won whose first call it brought, and their value", read: "CRM. A deal takes about 60 days, so the first on 4 Dec", state: "not yet", spark: [] },
      { id: "wait", name: "Wait for a first answer", value: "11 min", before: "26 h", aim: "Under 1 h", counts: "From their mail to our first answer, the usual one", read: "Mail, both times by the server", isDown: true, state: "good", spark: [26, 25, 27, 24, 26, 6, 3, 1.2, 0.6, 0.4, 0.2, 0.2] },
      { id: "bo", name: "Bo’s time per good call", value: "3 min", before: "17 min, Bo’s guess", aim: "Under 10 min", counts: "Open and answering what it asks, not the call", read: "The asks Bo answered", isDown: true, isGuard: true, state: "good", spark: [17, 17, 17, 17, 17, 9, 7, 6, 5, 4, 4, 3] },
      { id: "stop", name: "People who said stop", value: "1 of 96", before: "Unknown", aim: "Under 3 in 100", counts: "Asked us not to write again, 30 days", read: "Mail, checked by Bo", isDown: true, isGuard: true, state: "good", spark: [] },
      { id: "cost", name: "Cost per good call", value: "$5.80", before: "None", aim: "Under $15", counts: "Models and searches, all of Sales", read: "The bill", isDown: true, isGuard: true, state: "good", spark: [] },
    ],
    lost: [
      { id: "came", label: "41 came in", about: "5 only watched, 2 left alone, 1 waits for Bo", n: "41", change: "Find companies like our best: from Watch to Ask" },
      { id: "took", label: "33 taken on", about: "21 are still open, 9 of them wait for the customer", n: "33" },
      { id: "booked", label: "12 booked", about: "2 did not come, 1 was too small", n: "12", change: "One reminder the day before the call" },
      { id: "good", label: "9 good calls", about: "What counts", n: "9" },
    ],
  },
  coding: {
    said: "Bugs people report should get fixed, stay fixed, and not eat Chidi’s week.",
    text: "20 fixes a week that stay fixed, by 30 November", who: "Chidi Okafor, 14 Sep", state: "On its line", isBehind: false,
    weeks: CODING_WEEKS, result: [8, 10, 9, 9, 10, 12, 13, 14, 15, 16, 17, 18], line: lineTo(12, 3, 9, 20, 11), unit: "Fixes that stayed",
    note: "A fix counts 14 days later, so the newest week is 11 Nov",
    brought: [
      { name: "Bugs", values: [4, 5, 5, 4, 5, 6, 7, 7, 8, 8, 9, 10] },
      { name: "Features", values: [2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3] },
      { name: "Upkeep", values: [2, 3, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5] },
    ],
    measures: [
      { id: "fixes", name: "Fixes that stayed, a week", value: "18", before: "9", aim: "20 by 30 Nov", counts: "Closed by a merged change, not reopened or undone for 14 days", read: "GitHub, closed and merged by people", state: "good", spark: [8, 10, 9, 9, 10, 12, 13, 14, 15, 16, 17, 18] },
      { id: "wait", name: "Wait of who reported it", value: "1.8 d", before: "5.2 d", aim: "Under 2 days", counts: "From the issue to the release with the fix", read: "GitHub", isDown: true, state: "good", spark: [5.4, 5, 5.2, 4.6, 4.1, 3.6, 3.2, 2.9, 2.4, 2.1, 1.9, 1.8] },
      { id: "people", name: "A person’s time per fix", value: "14 min", before: "55 min, their guess", aim: "Under 20 min", counts: "Reviews and answers, until the merge", read: "GitHub reviews and the asks answered", isDown: true, isGuard: true, state: "good", spark: [55, 55, 55, 48, 40, 33, 28, 25, 20, 18, 15, 14] },
      { id: "undone", name: "Undone in 14 days", value: "4%", before: "7%", aim: "Under 10%", counts: "Reverted, or the issue opened again", read: "GitHub", isDown: true, isGuard: true, state: "good", spark: [7, 8, 6, 7, 6, 7, 5, 5, 4, 5, 4, 4] },
      { id: "users", name: "Seen by users", value: "Not yet", before: "Unknown", aim: "Fewer errors", counts: "Errors people meet, per 1,000 visits", read: "Sentry, from 1 Dec: it waits for a yes to connect", isDown: true, state: "not yet", spark: [] },
      { id: "cost", name: "Cost per fix", value: "$7.80", before: "None", aim: "Under $20", counts: "Models and machines, all of Coding", read: "The bill", isDown: true, isGuard: true, state: "good", spark: [] },
    ],
    lost: [
      { id: "came", label: "86 came in", about: "31 the same as another, 19 for Support, 12 not for us", n: "86" },
      { id: "took", label: "24 taken on", about: "2 wait for a review, 3 days the longest", n: "24", change: "Ask a second reviewer after one day" },
      { id: "merged", label: "19 merged", about: "1 in 9 came back once before the merge", n: "19" },
      { id: "good", label: "18 stayed fixed", about: "What counts, two weeks on", n: "18" },
    ],
  },
};

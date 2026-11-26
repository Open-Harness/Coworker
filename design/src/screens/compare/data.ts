/* Sales’s playbook, version 6 beside the proposed 7, on the same past cases. The weakest part, Look for signs, is the one that changes.
   Agrees with the comment in the playbook: 68% became work (19 of 28); version 7 finds 22 with all 19 among them (86%) and leaves 6 that were only a new page. */

export type Group = "The change" | "The cases" | "Must not get worse";
export const GROUPS: readonly Group[] = ["The change", "The cases", "Must not get worse"];

/** One side of a row. `n` is what is compared; `text` is what is shown; `note` is the small line under it. */
export interface Side { readonly text: string; readonly n?: number; readonly note?: string }
export interface Line { readonly id: string; readonly label: string; readonly group: Group; /** Absent: the two differ, neither is better. */ readonly better?: "higher" | "lower"; readonly six: Side; readonly seven: Side }

export const LINES: readonly Line[] = [
  { id: "part", label: "Part", group: "The change", six: { text: "Look for signs" }, seven: { text: "Look for signs" } },
  { id: "was", label: "What counts as a sign", group: "The change", six: { text: "A new site." }, seven: { text: "A new site at its own address." } },
  { id: "ask", label: "Who says yes", group: "The change", six: { text: "Ama" }, seven: { text: "Ama, it changes what counts as a sign" } },
  { id: "found", label: "Found, of the 28 cases", group: "The cases", six: { text: "28", n: 28, note: "19 became work" }, seven: { text: "22", n: 22, note: "6 only a new page left out" } },
  { id: "work", label: "Became work", group: "The cases", better: "higher", six: { text: "68%", n: 68, note: "19 of 28, as it ran this week" }, seven: { text: "86%", n: 86, note: "19 of 22. None of the 19 is lost" } },
  { id: "cost", label: "What it cost, all cases", group: "The cases", better: "lower", six: { text: "$13", n: 13 }, seven: { text: "$11", n: 11, note: "6 fewer to write" } },
  { id: "min", label: "Minutes from found to ready", group: "The cases", better: "lower", six: { text: "18", n: 18 }, seven: { text: "17", n: 17 } },
  { id: "bo", label: "Bo’s minutes per good call", group: "Must not get worse", better: "lower", six: { text: "9", n: 9, note: "aim: under 10" }, seven: { text: "9", n: 9, note: "aim: under 10" } },
  { id: "stop", label: "Who say stop, of 100", group: "Must not get worse", better: "lower", six: { text: "2", n: 2, note: "aim: under 3" }, seven: { text: "2", n: 2, note: "aim: under 3" } },
  { id: "good", label: "Cost per good call", group: "Must not get worse", better: "lower", six: { text: "$5.80", n: 5.8, note: "aim: under $15" }, seven: { text: "$5.40", n: 5.4, note: "aim: under $15" } },
];

/** The cases where they differ: what each did. On the other 22 they did the same. */
export interface Differ { readonly id: string; readonly what: string; readonly six: string; readonly seven: string }
export const DIFFER: readonly Differ[] = [
  { id: "d1", what: "Vanna Linen put up a page for a new range", six: "Counted it as a new site, and wrote. No answer.", seven: "Left it alone: a page, not a site at its own address." },
  { id: "d2", what: "Brightside Print put up a spring page", six: "Counted it as a new site, and asked Bo. Bo said no.", seven: "Left it alone, and kept it as a case." },
  { id: "d3", what: "Rowan Tools put up a news page", six: "Counted it as a new site, and wrote. A reply: wrong person.", seven: "Left it alone: a page, not a site at its own address." },
  { id: "d4", what: "Holm & Daughters put up a sale page", six: "Counted it as a new site, and wrote. No answer.", seven: "Left it alone: a page, not a site at its own address." },
  { id: "d5", what: "Fenwick Cycles put up a jobs page", six: "Counted it as a new site, and asked Bo. Bo said no.", seven: "Left it alone, and kept it as a case." },
  { id: "d6", what: "Marlow Paints put up a gallery page", six: "Counted it as a new site, and wrote. No answer.", seven: "Left it alone: a page, not a site at its own address." },
];

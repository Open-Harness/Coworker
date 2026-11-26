import type { CompareView, PlaybookView } from "~/modules/views-manager/types.ts";

/* The rows of the comparison, from what the trial says: one side is the version that runs, the other the one proposed. */

export type Group = "The change" | "The cases" | "Must not get worse";
export const GROUPS: readonly Group[] = ["The change", "The cases", "Must not get worse"];

/** One side of a row. `n` is what is compared; `text` is what is shown; `note` is the small line under it. */
export interface Side {
  readonly text: string;
  readonly n?: number;
  readonly note?: string;
}
export interface Line {
  readonly id: string;
  readonly label: string;
  readonly group: Group;
  /** Absent: the two differ, neither is better. */
  readonly better?: "higher" | "lower";
  readonly now: Side;
  readonly next: Side;
}

const money = (n: number): string => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const share = (passed: number, of: number): number => Math.round((passed / of) * 100);
const partName = (playbook: PlaybookView["playbook"], line: string): string => {
  const [head = "", id = ""] = line.split("/");
  return head === "triggers"
    ? (playbook.triggers.find((t) => t.id === id)?.name ?? id)
    : head === "agents"
      ? (playbook.agents.find((a) => a.id === id)?.name ?? id)
      : (playbook.kinds.find((k) => k.id === id)?.name ?? id);
};

export function linesOf(view: CompareView, playbook: PlaybookView["playbook"]): readonly Line[] {
  const { trial, asks, minutes, guards } = view;
  const [now, next] = [trial.now, trial.next];
  const part = partName(playbook, trial.of);
  const change = trial.changes[0];
  const kept = next.passed >= now.passed;
  const fewer = now.of - next.of;
  return [
    { id: "part", label: "Part", group: "The change", now: { text: part }, next: { text: part } },
    { id: "was", label: "What changes", group: "The change", now: { text: change?.was ?? "" }, next: { text: change?.becomes ?? "" } },
    { id: "ask", label: "Who says yes", group: "The change", now: { text: asks.person }, next: { text: `${asks.person}, ${asks.why}` } },
    {
      id: "found",
      label: `Found, of the ${now.of} cases`,
      group: "The cases",
      now: { text: String(now.of), n: now.of, note: `${now.passed} became work` },
      next: { text: String(next.of), n: next.of, note: `${fewer} left out` },
    },
    {
      id: "work",
      label: "Became work",
      group: "The cases",
      better: "higher",
      now: { text: `${share(now.passed, now.of)}%`, n: share(now.passed, now.of), note: `${now.passed} of ${now.of}, as it ran this week` },
      next: {
        text: `${share(next.passed, next.of)}%`,
        n: share(next.passed, next.of),
        note: `${next.passed} of ${next.of}${kept ? `. None of the ${now.passed} is lost` : ""}`,
      },
    },
    {
      id: "cost",
      label: "What it cost, all cases",
      group: "The cases",
      better: "lower",
      now: { text: money(now.cost), n: now.cost },
      next: { text: money(next.cost), n: next.cost, note: `${fewer} fewer to write` },
    },
    {
      id: "min",
      label: "Minutes from found to ready",
      group: "The cases",
      better: "lower",
      now: { text: String(minutes.now), n: minutes.now },
      next: { text: String(minutes.next), n: minutes.next },
    },
    ...guards.map((g, i): Line => {
      const said = (n: number): string => (g.unit === "dollars" ? money(n) : String(n));
      const note = `aim: under ${said(g.limit)}`;
      return {
        id: `guard${i}`,
        label: g.counts,
        group: "Must not get worse",
        better: "lower",
        now: { text: said(g.now), n: g.now, note },
        next: { text: said(g.next), n: g.next, note },
      };
    }),
  ];
}

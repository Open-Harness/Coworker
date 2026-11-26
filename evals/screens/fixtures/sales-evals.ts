import type { Eval } from "~/modules/playbook/types.ts";

/* How good each part is: its eval, how it began, what it is now. design/src/screens/playbook/data.ts. */

const cases = (of: string, n: number): readonly string[] => Array.from({ length: n }, (_, i) => `${of}-${String(i + 1).padStart(2, "0")}`);
const e = (of: string, good: string, judge: Eval["judge"], n: number, value: number, unit: string): Omit<Eval, "id"> => ({
  of,
  good,
  judge,
  cases: cases(of.split("/").pop() ?? of, n),
  line: { value, unit },
});

/** One eval of each part, with how it began, what it is now, and who judges it in words. `id` is its file. */
export interface EvalFacts {
  readonly id: string;
  readonly eval: Omit<Eval, "id">;
  readonly first: number;
  readonly now: number;
  readonly seen: number;
  readonly how: string;
}
const bo = { person: "bo" } as const;
export const EVALS: readonly EvalFacts[] = [
  {
    id: "playbook",
    eval: e("playbook", "Good calls a week", bo, 0, 12, "calls a week"),
    first: 5,
    now: 9,
    seen: 41,
    how: "Bo, in the CRM",
  },
  {
    id: "signal-write",
    eval: e("workflow/signal/write", "Goes on the first time", bo, 40, 70, "percent"),
    first: 46,
    now: 79,
    seen: 33,
    how: "Reader, then Bo",
  },
  { id: "signal-yes", eval: e("workflow/signal/yes", "Bo says yes", bo, 22, 75, "percent"), first: 73, now: 86, seen: 22, how: "Bo" },
  { id: "writer", eval: e("agents/writer", "Bo sends it unchanged", bo, 40, 70, "percent"), first: 46, now: 79, seen: 33, how: "Bo" },
  {
    id: "researcher",
    eval: e("agents/researcher", "No fact corrected", bo, 61, 85, "percent"),
    first: 88,
    now: 94,
    seen: 41,
    how: "Bo, on one in five",
  },
  {
    id: "reader",
    eval: e("agents/reader", "Mistakes it caught", "code", 11, 9, "of 11"),
    first: 9,
    now: 10,
    seen: 33,
    how: "The same 11, put in on purpose",
  },
  {
    id: "bos-voice",
    eval: e("skills/bos-voice", "More unchanged with it than without", { model: "claude-sonnet-5-5", agreesWith: "bo" }, 40, 5, "points"),
    first: 24,
    now: 31,
    seen: 33,
    how: "A model, agrees with Bo 37 of 40",
  },
  { id: "sign", eval: e("skills/sign", "More yes with it than without", bo, 22, 5, "points"), first: 35, now: 33, seen: 22, how: "Bo" },
  {
    id: "signs",
    eval: e("triggers/signs", "Finds that became work", "code", 22, 50, "percent"),
    first: 86,
    now: 68,
    seen: 6,
    how: "Counted",
  },
  {
    id: "like",
    eval: e("triggers/like", "Finds that became work", bo, 18, 50, "percent"),
    first: 50,
    now: 69,
    seen: 5,
    how: "Bo, right or wrong",
  },
];

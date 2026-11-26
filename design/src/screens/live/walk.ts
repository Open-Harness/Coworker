/* A walkthrough is what a person would do, in order: go to the page, open the pencil, change one field, keep it, and stop where only a person may go on. */

export const ORIG = "Weekdays, 08:30";
export const NEW = "Tuesday to Friday, 08:30";
export interface Draft { part: "Playbook" | "Triggers"; editing: boolean; when: string; kept: boolean; saved: boolean }
export const EMPTY: Draft = { part: "Playbook", editing: false, when: ORIG, kept: false, saved: false };
export type Target = "list" | "pencil" | "when" | "rest" | "keep" | "save" | "cell";
/** One thing Juno does. `say`: what it says while it does it. `yours`: it stops, and only a person goes on. */
export interface Step { readonly at: Target; readonly say: string; readonly call: string; readonly on: string; readonly set: Partial<Draft>; readonly typed?: "when"; readonly yours?: boolean }

export const CHANGES = "4 runs a week instead of 5. Monday’s signs are found on Tuesday, so nothing is lost. About $0.60 less a week.";
export const STEPS: readonly Step[] = [
  { at: "list", say: "Signs are looked for by a trigger, so I go to Sales, Playbook, Triggers.", call: "go", on: "Sales, Playbook, Triggers", set: {} },
  { at: "list", say: "I press Triggers.", call: "press", on: "Triggers", set: { part: "Triggers" } },
  { at: "pencil", say: "Look for signs runs every weekday, so Mondays too. This is its pencil.", call: "point", on: "Look for signs", set: {} },
  { at: "pencil", say: "I press it to edit the trigger.", call: "trigger.edit", on: "Look for signs", set: { editing: true } },
  { at: "when", say: "I change When from Weekdays to Tuesday to Friday. The time stays.", call: "fill", on: "When", set: { when: NEW }, typed: "when" },
  { at: "rest", say: "I leave the rest as it is: what happens, only when, at most.", call: "point", on: "the other fields", set: {} },
  { at: "keep", say: "I press Keep.", call: "press", on: "Keep", set: { editing: false, kept: true } },
  { at: "save", say: `I stop before Save as version 7. ${CHANGES} Shall I save it?`, call: "version.save", on: "waits for you", set: {}, yours: true },
  { at: "cell", say: "Version 7 is saved. Mondays come back on 4 January, I put that in.", call: "version.save", on: "version 7", set: {} },
];
/** What it says when the person answers Not yet. */
export const NOT_YET: Step = { at: "save", say: "Not saved. The change stays on this page, and Save as version 7 is there when you want it. Nothing has changed for Sales.", call: "version.save", on: "not yet", set: {} };
export const STOP = STEPS.findIndex((s) => s.yours);
export const LAST = STEPS.length - 1;
/** The step at n; the last one reads differently when the answer was Not yet. */
export const stepAt = (n: number, isSaved: boolean): Step => (n === LAST && !isSaved ? NOT_YET : STEPS[n]!);

/** The screen as it is after the first `n` steps, with the step at `n` typed as far as `typed` says. */
export function draftAt(n: number, typed: number): Draft {
  const d = STEPS.slice(0, n).reduce<Draft>((x, s) => ({ ...x, ...s.set }), EMPTY);
  const s = STEPS[n];
  if (!s) return d;
  if (!s.typed) return typed >= 1 ? { ...d, ...s.set } : d;
  if (typed <= 0) return d;
  const full = s.set[s.typed] ?? "";
  return { ...d, [s.typed]: full.slice(0, Math.max(1, Math.ceil(full.length * typed))) };
}

/** When a person does it by hand: the next thing to touch, so a hint can point at it. */
export function nextByHand(d: Draft): Target {
  if (d.saved) return "cell";
  if (d.part === "Playbook") return "list";
  if (d.editing) return d.when === ORIG ? "when" : "keep";
  return d.kept ? "save" : "pencil";
}
/** How long a step stays, in milliseconds: time to see it and to read what is said. */
export const dwell = (s: Step, isAloud: boolean) => Math.max(1800, s.say.length * (isAloud ? 70 : 42) + (s.typed ? 700 : 0));

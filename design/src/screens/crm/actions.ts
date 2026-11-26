import { NOW, STAGES } from "./data";
import type { Deal, Ev } from "./data";

const ME = "Ama Mensah";
const add = (d: Deal, ev: (id: string) => Ev[]): Ev[] => [...d.events, ...ev(`${d.id}-${d.events.length}`)];

/** You told Sales something about this deal. The CRM does not see it. */
export const withTold = (d: Deal, text: string): Deal => ({ ...d, events: add(d, (id) => [{ kind: "told", id, at: NOW, text }]) });

/** A note written on the deal, in the CRM. Sales reads it. */
export const withNote = (d: Deal, text: string): Deal => ({
  ...d,
  notes: [...d.notes, { by: ME, at: NOW, text }],
  events: add(d, (id) => [{ kind: "entry", id, at: NOW, who: ME, dir: "out", text: "Wrote a note", note: text }]),
});

/** Your answer to the one change Sales waits to make. */
export function withAnswer(d: Deal, yes: boolean): Deal {
  if (d.pending === null) return d;
  const to = STAGES[d.pending].label;
  if (!yes) return { ...d, pending: null, events: add(d, (id) => [{ kind: "entry", id, at: NOW, who: ME, dir: "out", text: `Said no to moving this to ${to}` }]) };
  return {
    ...d, stage: d.pending, pending: null,
    events: add(d, (id) => [
      { kind: "entry", id, at: NOW, who: ME, dir: "out", text: `Said yes to moving this to ${to}` },
      { kind: "entry", id: `${id}b`, at: NOW, who: "Sales", dir: "out", text: `Moved this to ${to}` },
    ]),
  };
}

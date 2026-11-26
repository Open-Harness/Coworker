import type { Kind } from "~/modules/playbook/types.ts";

interface Column {
  readonly id: string;
  readonly name: string;
  readonly tip: string;
}

/** Triage first, then each step once in the order met over the kinds, then Done. */
export function columns(kinds: readonly Kind[]): readonly Column[] {
  const steps = new Map<string, Column>();
  for (const kind of kinds)
    for (const step of kind.steps)
      if (!steps.has(step.id))
        steps.set(step.id, { id: step.id, name: step.name, tip: step.does.trim() === "" ? `${step.name}.` : step.does });
  return [
    { id: "triage", name: "Triage", tip: "Work that is taken on and waits for a place to start." },
    ...steps.values(),
    { id: "done", name: "Done", tip: "Work that has ended: done, no, dropped, stopped or handed over." },
  ];
}

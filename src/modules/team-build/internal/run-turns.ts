import type { RunData } from "../types.ts";

type Line = RunData["lines"][number];

/** What an agent wrote, or the steps it took between writing. */
export type TurnPart =
  | { readonly kind: "words"; readonly id: string; readonly text: string; readonly isStreaming: boolean }
  | { readonly kind: "steps"; readonly id: string; readonly steps: readonly { readonly id: string; readonly text: string }[] };

/** One thing in a run's transcript: the brief it was given, or a stretch of the agent working. */
export type Turn =
  | { readonly kind: "brief"; readonly id: string; readonly text: string }
  | { readonly kind: "agent"; readonly id: string; readonly parts: readonly TurnPart[] };

/** A run's lines as the conversation they are: the brief, then the agent's words and the steps between them, oldest first. */
export function turnsOf(lines: readonly Line[]): readonly Turn[] {
  const turns: Turn[] = [];
  for (const line of lines) {
    if (line.role === "person") {
      turns.push({ kind: "brief", id: line.id, text: line.text });
      continue;
    }
    const last = turns.at(-1);
    const part: TurnPart =
      line.role === "manager"
        ? { kind: "words", id: line.id, text: line.text, isStreaming: line.streaming === true }
        : { kind: "steps", id: line.id, steps: [{ id: line.id, text: line.text }] };
    if (last?.kind !== "agent") {
      turns.push({ kind: "agent", id: line.id, parts: [part] });
      continue;
    }
    const before = last.parts.at(-1);
    const parts =
      part.kind === "steps" && before?.kind === "steps"
        ? [...last.parts.slice(0, -1), { ...before, steps: [...before.steps, ...part.steps] }]
        : [...last.parts, part];
    turns[turns.length - 1] = { ...last, parts };
  }
  return turns;
}

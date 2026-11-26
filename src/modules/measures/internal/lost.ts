import type { Lost } from "../types.ts";

/** The step that lost the most in absolute number, the first on a tie; null when nothing was lost. */
export function lost(steps: Lost["steps"]): Lost {
  let most: string | null = null;
  let biggest = 0;
  for (const step of steps) {
    const gone = step.in - step.on;
    if (gone > biggest) {
      biggest = gone;
      most = step.name;
    }
  }
  return { steps, most };
}

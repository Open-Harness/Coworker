import type { Because, Line } from "~/modules/playbook/types.ts";
import type { Walkthrough } from "../types.ts";
import { readBecause } from "./because.ts";

/** Every line of the draft, with why it is there. */
export function because(walk: Walkthrough): Readonly<Record<Line, Because>> {
  return Object.fromEntries(readBecause(walk.draft));
}

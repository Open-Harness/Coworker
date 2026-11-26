import type { Doing } from "../types.ts";
import { d, f } from "./make.ts";

export const console3: readonly Doing[] = [
  d(
    "history.undo",
    "Co-worker",
    "Builder",
    "ask",
    false,
    "co-worker",
    "Undo something from the history",
    "Undo",
    "undid {entry}",
    null,
    f("entry", "pick"),
  ),
];

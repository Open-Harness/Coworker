import type { Doing } from "../types.ts";
import { d, f } from "./make.ts";

export const managers3: readonly Doing[] = [
  d(
    "eval.judge",
    "Managers",
    "Member",
    "off",
    true,
    "managers",
    "Judge a case",
    "Judge",
    "judged {case} as {said} on {manager}",
    "Judge it again",
    f("manager", "pick"),
    f("case", "pick"),
    f("said", "pick"),
  ),
  d(
    "eval.retire",
    "Managers",
    "Builder",
    "off",
    true,
    "managers",
    "Retire an eval",
    "Retire eval",
    "retired {eval} on {manager}",
    null,
    f("manager", "pick"),
    f("eval", "pick"),
  ),
];

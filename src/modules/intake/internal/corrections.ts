import type { Kind } from "~/modules/playbook/types.ts";
import type { Corrections } from "../types.ts";

/** After a correction: two wrong in a row sends a kind that does or asks back a step. */
export function afterCorrection(alone: Kind["alone"], corrections: Corrections): Kind["alone"] {
  const lastTwo = corrections.slice(-2);
  if (lastTwo.length < 2 || lastTwo.some((c) => c !== "wrong")) return alone;
  return alone === "do" ? "ask" : alone === "ask" ? "watch" : alone;
}

/** Ten right in a row, and never wrong in the last twenty: what it may be widened to, proposed and never done. */
export function mayWiden(alone: Kind["alone"], corrections: Corrections): Kind["alone"] | undefined {
  const wider = alone === "watch" ? "ask" : alone === "ask" ? "do" : undefined;
  if (wider === undefined) return undefined;
  const lastTwenty = corrections.slice(-20);
  const lastTen = corrections.slice(-10);
  if (lastTen.length < 10 || lastTen.some((c) => c !== "right") || lastTwenty.includes("wrong")) return undefined;
  return wider;
}

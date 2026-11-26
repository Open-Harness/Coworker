import type { Standing } from "../types.ts";
import { DAY } from "./time.ts";

/** Two weeks below its line. */
export function needsALook(standing: Standing, now: number): boolean {
  return standing._tag === "Read" && standing.is === "below its line" && now - standing.since >= 14 * DAY;
}

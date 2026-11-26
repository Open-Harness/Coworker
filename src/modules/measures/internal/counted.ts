import type { Reading } from "../types.ts";
import { durationMs } from "./time.ts";

/** Readings that count now: settled, one per `of` (the one read later), oldest first. */
export function counted(readings: readonly Reading[], settles: string, now: number): readonly Reading[] {
  const wait = durationMs(settles);
  const latest = new Map<number, Reading>();
  for (const reading of readings) {
    if (reading.of + wait > now) continue;
    const held = latest.get(reading.of);
    if (!held || reading.at > held.at) latest.set(reading.of, reading);
  }
  return [...latest.values()].toSorted((a, b) => a.of - b.of);
}

/** When the first reading that is not settled yet will count, or null when none waits. */
export function nextSettles(readings: readonly Reading[], settles: string, now: number): number | null {
  const wait = durationMs(settles);
  const waiting = readings.map((r) => r.of + wait).filter((when) => when > now);
  return waiting.length === 0 ? null : Math.min(...waiting);
}

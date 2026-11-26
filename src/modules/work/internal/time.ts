const UNIT: Readonly<Record<string, number>> = { m: 60_000, h: 3_600_000, d: 86_400_000 };

/** `45m`, `4h`, `3d` in milliseconds. Anything else is a day, and never less than a minute. */
export function lookMs(look: string): number {
  const found = /^(\d+)\s*([mhd])$/u.exec(look.trim());
  if (!found) return UNIT["d"] ?? 86_400_000;
  const each = UNIT[found[2] ?? "d"] ?? 86_400_000;
  return Math.max(Number(found[1]) * each, 60_000);
}

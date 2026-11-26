import type { Hears, Judgement, OpenWork, Verdict } from "../types.ts";

function isRecord(x: unknown): x is Readonly<Record<string, unknown>> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** One verdict with only its five fields, or nothing if it is not one. */
function toVerdict(x: unknown): Verdict | undefined {
  if (!isRecord(x)) return undefined;
  const { manager, kind, is, why, fit } = x;
  if (typeof manager !== "string" || typeof kind !== "string" || typeof is !== "boolean") return undefined;
  if (typeof why !== "string" || typeof fit !== "number" || !Number.isFinite(fit)) return undefined;
  return { manager, kind, is, why, fit: Math.min(1, Math.max(0, fit)) };
}

const keyOf = (manager: string, kind: string) => JSON.stringify([manager, kind]);

/** What the judge's `judge` call said, narrowed. A kind or a work that is not there is not a verdict. */
export function verdicts(called: unknown, hears: readonly Hears[], open: readonly OpenWork[]): Judgement {
  if (!isRecord(called) || !Array.isArray(called.verdicts))
    return { _tag: "CouldNot", why: "The judge's answer did not have the shape of a list of verdicts." };
  const asked = hears.filter((h) => !h.paused).flatMap((h) => h.kinds.map((k) => ({ manager: h.manager, kind: k.id })));
  const wanted = new Set(asked.map((a) => keyOf(a.manager, a.kind)));
  const seen = new Set<string>();
  const kept: Verdict[] = [];
  for (const raw of called.verdicts as readonly unknown[]) {
    const one = toVerdict(raw);
    if (one === undefined) continue;
    const key = keyOf(one.manager, one.kind);
    if (!wanted.has(key) || seen.has(key)) continue;
    seen.add(key);
    kept.push(one);
  }
  const missing = asked.filter((a) => !seen.has(keyOf(a.manager, a.kind)));
  if (missing.length > 0)
    return {
      _tag: "CouldNot",
      why: `The judge did not say about ${missing.map((m) => `kind ${m.kind} of ${m.manager}`).join(", ")}.`,
    };
  const joins = typeof called.joins === "string" && open.some((w) => w.id === called.joins) ? called.joins : undefined;
  return { _tag: "Judged", judged: { verdicts: kept, ...(joins === undefined ? {} : { joins }) } };
}

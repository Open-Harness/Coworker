import type { Doing, Found, Who } from "../types.ts";
import { offered } from "./offered.ts";

const order = { ask: 0, go: 1, do: 2, find: 3 } as const;

/** 0 the same, 1 begins with it, 2 has it, 3 only the `about` has it; none when nothing does. */
function match(words: string, names: readonly string[], about: string): number | null {
  const lower = names.map((n) => n.toLowerCase());
  if (lower.includes(words)) return 0;
  if (lower.some((n) => n.startsWith(words))) return 1;
  if (lower.some((n) => n.includes(words))) return 2;
  return about.toLowerCase().includes(words) ? 3 : null;
}

function ofDoing(x: Doing): Found {
  return { is: "do", id: x.id, label: x.label, about: x.group };
}

interface Ranked {
  readonly found: Found;
  readonly rank: number;
}

/** What the palette shows for some words: asking first, then places, doings and things, best first. */
export function find(all: readonly Doing[], words: string, who: Who, things: readonly Found[]): readonly Found[] {
  const w = words.trim().toLowerCase();
  if (w === "") return [];
  const ask: Found = { is: "ask", id: "ask", label: `Ask: ${words.trim()}`, about: "Ask the co-worker, in words." };
  const ranked: Ranked[] = [];
  for (const x of offered(all, who)) {
    const rank = match(w, [x.label, x.id], "");
    if (rank !== null) ranked.push({ found: ofDoing(x), rank });
  }
  for (const t of things) {
    const rank = t.is === "ask" ? null : match(w, [t.label], t.about);
    if (rank !== null) ranked.push({ found: t, rank });
  }
  const sorted = ranked.toSorted((a, b) => order[a.found.is] - order[b.found.is] || a.rank - b.rank);
  return [ask, ...sorted.map((r) => r.found)];
}

import type { Walked, Walkthrough } from "../types.ts";

export type Does = Extract<Walked, { _tag: "Walked" }>["does"];

export function refuse(why: string): Walked {
  return { _tag: "Refused", why };
}

export function walked(walk: Walkthrough, does: Does = []): Walked {
  return { _tag: "Walked", walk, does };
}

export function isEnded(walk: Walkthrough): boolean {
  return walk.stage === "made" || walk.stage === "thrown away" || walk.stage === "carried by another";
}

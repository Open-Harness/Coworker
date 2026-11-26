import { clash } from "./internal/clash.ts";
import { stale } from "./internal/stale.ts";
import { tell } from "./internal/tell.ts";
import type { Knowledge } from "./types.ts";

export const knowledge: Knowledge = {
  tell,
  mayPropose: (correction) => correction.inside,
  clash,
  stale,
};

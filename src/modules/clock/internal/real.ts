import type { Clock, Ids } from "../types.ts";

export const systemClock: Clock = { now: () => Date.now() };

export const randomIds: Ids = {
  next: (prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
};

import type { Polling } from "../types.ts";

/** Calls `read` until it gives a value, or time is up. A read that throws counts as "not yet". */
export async function eventually<T>(read: () => Promise<T | undefined>, polling: Polling): Promise<T | undefined> {
  const until = polling.now() + polling.withinMs;
  for (;;) {
    const value = await read().catch(() => undefined);
    if (value !== undefined) return value;
    if (polling.now() + polling.everyMs > until) return undefined;
    await polling.sleep(polling.everyMs);
  }
}

import type { Working, WorkingDeps } from "./types.ts";

/** Calling the core before it is built is a wiring mistake, so it is loud: the call rejects and says what was called. */
const notBuilt = async (what: string): Promise<never> => Promise.reject(new Error(`Not built: working.${what}`));

/** What a manager does with its work. Not built: the loop it runs on is `agent`, over pi-durable. */
export function createWorking(_deps: WorkingDeps): Working {
  return {
    take: () => notBuilt("take"),
    answered: () => notBuilt("answered"),
    heard: () => notBuilt("heard"),
    news: () => notBuilt("news"),
    event: () => notBuilt("event"),
    adopt: () => notBuilt("adopt"),
    open: () => [],
    run: () => notBuilt("run"),
    due: () => notBuilt("due"),
  };
}

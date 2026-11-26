import type { Console } from "./types.ts";
import type { ConsoleDeps } from "./types.ts";
import { read, write } from "./internal/routes.ts";

export { remoteStore, type Send } from "./internal/remote.ts";
export { lookWeekly } from "./internal/look.ts";

/** The console for one person in one workspace. */
export const createConsole = (deps: ConsoleDeps): Console => ({
  read: (call) => read(call, deps),
  write: (call) => write(call, deps),
});

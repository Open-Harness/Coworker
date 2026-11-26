import { checkBundle } from "./internal/check.ts";
import type { Boxes, BoxHost, GitPort } from "./types.ts";
import type { Clock } from "~/modules/clock/types.ts";

function notBuilt(what: string): never {
  throw new Error(`Not built: ${what}`);
}

export { checkBundle };

/** Over the manager object's own storage, so that a call that was answered is never run again. */
export const createBoxes = (_: { readonly sql: SqlStorage; readonly host: BoxHost; readonly git: GitPort; readonly clock: Clock }): Boxes =>
  notBuilt("boxes.createBoxes");

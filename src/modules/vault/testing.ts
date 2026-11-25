import { aesMasterKey } from "./internal/master-key.ts";
import type { MasterKey } from "./types.ts";

/** A fixed master key for the fast tier. `fill` makes a different one. */
export const testMasterKey = (id = "test-1", fill = 1): MasterKey => aesMasterKey(id, new Uint8Array(32).fill(fill));

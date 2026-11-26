import type { Context } from "@earendil-works/chord/context";
import type { Harness } from "@earendil-works/pi-durable";
import type { DocumentRow, DocumentVersion } from "~/modules/protocol/types.ts";

/** Documents the agent writes: kept with their versions, shared by everyone in the workspace. */
export interface Documents {
  list(harness: Pick<Harness, "snapshot">, context: Context): Promise<readonly DocumentRow[]>;
  /** The given version, or the latest. `undefined` when it does not exist or is no longer kept. */
  read(
    harness: Pick<Harness, "snapshot">,
    documentId: string,
    version: number | undefined,
    context: Context,
  ): Promise<DocumentVersion | undefined>;
}

import type { MakeBrain } from "~/modules/manager/types.ts";
import type { ModelCall, ModelPick, ModelRoute } from "~/modules/models/types.ts";

/** What a manager's brain asks of its Workspace object: which connection answers, and a call made with its credential. */
export interface ModelLink {
  modelRoute(wanted?: ModelPick): Promise<ModelRoute>;
  modelCall(call: ModelCall): Promise<Response>;
}

/**
 * A brain whose every model call is made by the manager's Workspace object. It holds no key and no provider address,
 * so nothing it stores, logs or is handed contains a credential. The entry is `workspaceBrain`, a `MakeBrain`.
 */
export type WorkspaceBrain = MakeBrain;

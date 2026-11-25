import { createModels } from "@earendil-works/pi-ai/models";
import type { Brain } from "~/modules/manager/types.ts";
import type { Model } from "@earendil-works/pi-ai";
import { CATALOGUE_ENTRY, MODEL_ID, PROVIDER, gatewayProvider, modelIdFor } from "./internal/provider.ts";
import type { ModelLink, WorkspaceBrain } from "./types.ts";

/** Stands where an API key would be. Nothing but the gateway's own fetch ever sees it, and it opens nothing. */
const PLACEHOLDER = "not-a-key";

const readyOf = async (workspace: ModelLink): Promise<{ readonly _tag: "NoModel"; readonly reason: string } | undefined> => {
  const route = await workspace.modelRoute();
  return route._tag === "NoModel" ? route : undefined;
};

/** A manager's brain over its workspace's model connection, whichever the workspace has: a key, an endpoint or ChatGPT. */
export const workspaceBrain: WorkspaceBrain = (workspace): Brain => {
  const models = createModels({ authContext: { env: async () => PLACEHOLDER, fileExists: async () => false } });
  const catalogue: Model<"openai-completions">[] = [CATALOGUE_ENTRY];
  models.setProvider(gatewayProvider(workspace, catalogue));
  const model = { provider: PROVIDER, modelId: MODEL_ID };
  return {
    models,
    model,
    ready: readyOf,
    modelFor: (choice) => {
      if (choice === null) return model;
      const id = modelIdFor(choice);
      if (!catalogue.some((entry) => entry.id === id)) catalogue.push({ ...CATALOGUE_ENTRY, id });
      return { provider: PROVIDER, modelId: id };
    },
  };
};

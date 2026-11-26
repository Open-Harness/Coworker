import { type Api, envApiKeyAuth, type Model } from "@earendil-works/pi-ai";
import { createProvider, type Provider } from "@earendil-works/pi-ai/models";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { openAIResponsesApi } from "@earendil-works/pi-ai/api/openai-responses.lazy";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import type { AgentConfig } from "../types.ts";

export const PROXY = "vibeproxy";

/** The catalog's facts about a model (context, price, thinking), served by the proxy instead of its maker. */
function viaProxy(model: Model<Api>, url: string): Model<Api> {
  const base = url.replace(/\/+$/u, "");
  return { ...model, provider: PROXY, baseUrl: model.api === "anthropic-messages" ? base : `${base}/v1` };
}

/** Models the catalog does not know are left out: without their limits the engine could not manage their context. */
export function proxyProvider({ url, models }: NonNullable<AgentConfig["proxy"]>): Provider {
  const catalog = [...openaiProvider().getModels(), ...anthropicProvider().getModels()];
  return createProvider({
    id: PROXY,
    name: "VibeProxy",
    auth: { apiKey: envApiKeyAuth("VibeProxy key", ["PROXY_KEY"]) },
    models: models.flatMap((id) => {
      const known = catalog.find((model) => model.id === id);
      return known === undefined ? [] : [viaProxy(known, url)];
    }),
    api: { "openai-responses": openAIResponsesApi(), "anthropic-messages": anthropicMessagesApi() },
  });
}

import { envApiKeyAuth, type Model, type ProviderStreams } from "@earendil-works/pi-ai";
import { createProvider, type Provider } from "@earendil-works/pi-ai/models";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import type { ModelPick, ModelRoute } from "~/modules/models/types.ts";
import type { ModelLink } from "../types.ts";
import { GATEWAY_HOST, gatewayFetch } from "./gateway.ts";
import { relay } from "./relay.ts";

export const PROVIDER = "workspace";
/**
 * The one model the manager's conversations name. The Workspace object decides which real model answers each call, so
 * a conversation survives the workspace changing its connection.
 */
export const MODEL_ID = "workspace-model";

/** What the catalog knows of it: little. The real limits belong to the connection's model, which the workspace picks. */
const LIMITS = {
  id: MODEL_ID,
  name: "The workspace's model",
  provider: PROVIDER,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  reasoning: false,
  contextWindow: 128_000,
  maxTokens: 16_384,
} as const satisfies Partial<Model<string>>;

/** The conversation's model name for a choice: the placeholder, then the connection and model chosen. A name only. */
export const modelIdFor = (pick: ModelPick): string => `${MODEL_ID}@${pick.connectionId}@${pick.model}`;

/** The choice a conversation's model name carries, if it carries one. */
export function pickOf(modelId: string): ModelPick | undefined {
  if (!modelId.startsWith(`${MODEL_ID}@`)) return undefined;
  const rest = modelId.slice(MODEL_ID.length + 1);
  const at = rest.indexOf("@");
  return at <= 0 ? undefined : { connectionId: rest.slice(0, at), model: rest.slice(at + 1) };
}

export const CATALOGUE_ENTRY: Model<"openai-completions"> = {
  ...LIMITS,
  input: [...LIMITS.input],
  api: "openai-completions",
  baseUrl: `https://${GATEWAY_HOST}`,
};

type Routed = Extract<ModelRoute, { readonly _tag: "Route" }>;

/** The catalogue entry aimed at the connection's path on the gateway, in the format that connection speaks. */
export function aimedAt(route: Routed): Model<"openai-completions"> | Model<"anthropic-messages"> {
  const base = `https://${GATEWAY_HOST}/${route.connectionId}`;
  // The model the workspace chose is the name the call carries, so it can keep it; otherwise the placeholder, which it replaces.
  const id = route.model ?? MODEL_ID;
  if (route.api === "anthropic-messages") return { ...LIMITS, id, input: [...LIMITS.input], api: "anthropic-messages", baseUrl: base };
  // OpenAI's own models take `max_completion_tokens`; other servers still expect `max_tokens`.
  const compat = route.source === "openai" || route.source === "chatgpt" ? { maxTokensField: "max_completion_tokens" as const } : undefined;
  return { ...CATALOGUE_ENTRY, id, baseUrl: `${base}/v1`, ...(compat === undefined ? {} : { compat }) };
}

/** `catalogue` is read on every lookup, so a choice named after the provider was made is found once it is added. */
export function gatewayProvider(workspace: () => Promise<ModelLink | undefined>, catalogue: Model<"openai-completions">[]): Provider {
  const apis = { "openai-completions": openAICompletionsApi(), "anthropic-messages": anthropicMessagesApi() };
  const streams: ProviderStreams = {
    stream: (model, context, options) =>
      relay(workspace, model, (target, route) =>
        apis[route.api].stream(aimedAt(route), context, { ...options, fetch: gatewayFetch(target) }),
      ),
    streamSimple: (model, context, options) =>
      relay(workspace, model, (target, route) =>
        apis[route.api].streamSimple(aimedAt(route), context, { ...options, fetch: gatewayFetch(target) }),
      ),
  };
  return createProvider({
    id: PROVIDER,
    name: "The workspace's model",
    auth: { apiKey: envApiKeyAuth("The workspace's model", ["DT_WORKSPACE_MODEL"]) },
    models: catalogue,
    api: streams,
  });
}

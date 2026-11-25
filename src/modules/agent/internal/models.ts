import { createModels, getSupportedThinkingLevels, type MutableModels } from "@earendil-works/pi-ai/models";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import type { ModelOption, ModelRef } from "~/modules/protocol/types.ts";
import type { AgentConfig } from "../types.ts";
import { fakeProvider } from "./fake.ts";
import { PROXY, proxyProvider } from "./proxy.ts";

/** In order of preference: the first one whose provider has a key becomes the default. */
const PREFERRED = ["vibeproxy/gpt-6-luna", "anthropic/claude-sonnet-5-5", "openai/gpt-6-luna", "fake/scripted"];

/** Keys come from the composition root, never from the process environment or files. */
export function buildModels(config: AgentConfig): MutableModels {
  const keys: Readonly<Record<string, string | undefined>> = {
    OPENAI_API_KEY: config.openaiKey,
    ANTHROPIC_API_KEY: config.anthropicKey,
    PROXY_KEY: config.proxy?.key ?? "unused",
  };
  const models = createModels({
    authContext: { env: async (name) => keys[name], fileExists: async () => false },
  });
  if (config.anthropicKey !== undefined) models.setProvider(anthropicProvider());
  if (config.openaiKey !== undefined) models.setProvider(openaiProvider());
  if (config.proxy !== undefined) models.setProvider(proxyProvider(config.proxy));
  if (config.fakeModel) models.setProvider(fakeProvider());
  return models;
}

export const modelOptions = (models: MutableModels): readonly ModelOption[] =>
  models.getModels().map((model) => ({
    provider: model.provider,
    modelId: model.id,
    label: model.provider === PROXY ? `${model.name} (VibeProxy)` : model.name,
    thinkingLevels: model.reasoning ? getSupportedThinkingLevels(model) : ["off"],
  }));

export function chooseDefault(options: readonly ModelOption[], wanted: string | undefined): ModelRef | undefined {
  const byName = (name: string) => options.find((option) => `${option.provider}/${option.modelId}` === name);
  const chosen =
    (wanted === undefined ? undefined : byName(wanted)) ?? PREFERRED.map(byName).find((option) => option !== undefined) ?? options[0];
  return chosen === undefined ? undefined : { provider: chosen.provider, modelId: chosen.modelId };
}

/** The default first, so a page without a choice shows what will answer. */
export const defaultFirst = (options: readonly ModelOption[], first: ModelRef | undefined): readonly ModelOption[] => {
  const isFirst = (option: ModelOption) => option.provider === first?.provider && option.modelId === first.modelId;
  return [...options.filter(isFirst), ...options.filter((option) => !isFirst(option))];
};

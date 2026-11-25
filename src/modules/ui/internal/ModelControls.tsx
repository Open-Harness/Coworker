import { Selector } from "@astryxdesign/core/Selector";
import type { ModelOption, ModelRef, ThinkingLevel } from "~/modules/protocol/types.ts";

interface ModelControlsProps {
  readonly models: readonly ModelOption[];
  readonly model?: ModelRef;
  readonly thinkingLevel: ThinkingLevel;
  readonly onConfigure: (change: { readonly model?: ModelRef; readonly thinkingLevel?: ThinkingLevel }) => void;
}

const keyOf = ({ provider, modelId }: ModelRef): string => `${provider}/${modelId}`;
const THINKING: Readonly<Record<ThinkingLevel, string>> = {
  off: "No thinking",
  minimal: "Minimal thinking",
  low: "Low thinking",
  medium: "Medium thinking",
  high: "High thinking",
  xhigh: "Very high thinking",
  max: "Maximum thinking",
};

/** Which model answers and how long it thinks. Thinking shows only for models with a choice. */
export function ModelControls({ models, model, thinkingLevel, onConfigure }: ModelControlsProps) {
  const selected = model === undefined ? undefined : models.find((option) => keyOf(option) === keyOf(model));
  const levels = selected?.thinkingLevels ?? [];
  return (
    <>
      <Selector
        label="Model"
        isLabelHidden
        variant="ghost"
        size="sm"
        placeholder="Choose a model"
        hasSearch={models.length > 8}
        options={models.map((option) => ({ value: keyOf(option), label: option.label }))}
        {...(selected === undefined ? {} : { value: keyOf(selected) })}
        onChange={(key) => {
          const option = models.find((candidate) => keyOf(candidate) === key);
          if (option !== undefined) {
            onConfigure({ model: { provider: option.provider, modelId: option.modelId } });
          }
        }}
      />
      {levels.length > 1 && (
        <Selector
          label="Thinking"
          isLabelHidden
          variant="ghost"
          size="sm"
          options={levels.map((level) => ({ value: level, label: THINKING[level] }))}
          value={levels.includes(thinkingLevel) ? thinkingLevel : (levels[0] ?? "off")}
          onChange={(level) => level !== null && onConfigure({ thinkingLevel: level as ThinkingLevel })}
        />
      )}
    </>
  );
}

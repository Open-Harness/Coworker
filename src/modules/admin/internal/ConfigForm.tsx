import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { AGENT_LIMITS, TOOL_GROUPS } from "~/modules/agent-config/service.ts";
import type { AgentConfig, ThinkingLevel, ToolGroup } from "~/modules/agent-config/types.ts";
import type { ModelOption, ModelRef } from "~/modules/protocol/types.ts";
import { PageSection } from "~/modules/ui/service.ts";

interface ConfigFormProps {
  readonly config: AgentConfig;
  readonly models: readonly ModelOption[];
  readonly onChange: (config: AgentConfig) => void;
}

const WORKSPACE_MODEL = "workspace";
const keyOf = ({ provider, modelId }: ModelRef): string => `${provider}/${modelId}`;
const LEVELS: readonly { readonly value: ThinkingLevel; readonly label: string }[] = [
  { value: "off", label: "Off" },
  { value: "minimal", label: "Minimal" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Very high" },
  { value: "max", label: "Maximum" },
];

function ModelFields({ config, models, onChange }: ConfigFormProps) {
  const { model, ...rest } = config;
  const known = models.find((option) => model !== undefined && keyOf(option) === keyOf(model));
  const levels = LEVELS.filter(({ value }) => known === undefined || known.thinkingLevels.includes(value));
  const choose = (key: string | null) => {
    const option = models.find((candidate) => keyOf(candidate) === key);
    onChange(option === undefined ? rest : { ...rest, model: { provider: option.provider, modelId: option.modelId } });
  };
  return (
    <>
      <Selector
        label="Model"
        hasSearch={models.length > 8}
        options={[
          { value: WORKSPACE_MODEL, label: "The workspace's model" },
          ...models.map((option) => ({ value: keyOf(option), label: option.label })),
        ]}
        value={model === undefined ? WORKSPACE_MODEL : keyOf(model)}
        onChange={choose}
        {...(model !== undefined && known === undefined
          ? { status: { type: "warning" as const, message: `${keyOf(model)} is not available here` } }
          : {})}
      />
      <Selector
        label="Thinking"
        options={[...levels]}
        value={config.thinkingLevel}
        onChange={(level) => level !== null && onChange({ ...config, thinkingLevel: level as ThinkingLevel })}
      />
    </>
  );
}

/** A config as fields. */
export function ConfigForm({ config, models, onChange }: ConfigFormProps) {
  const isNameless = config.name.trim() === "";
  return (
    <>
      <PageSection title="General">
        <FormLayout>
          <TextInput
            label="Name"
            value={config.name}
            onChange={(name) => onChange({ ...config, name })}
            width="100%"
            {...(isNameless ? { status: { type: "error" as const, message: "An agent needs a name" } } : {})}
          />
          <ModelFields config={config} models={models} onChange={onChange} />
          <TextArea
            label="Description"
            description="What people read when they choose an agent."
            isOptional
            rows={2}
            value={config.description}
            maxLength={AGENT_LIMITS.description}
            onChange={(description) => onChange({ ...config, description })}
            width="100%"
          />
          <TextArea
            label="System prompt"
            isOptional
            rows={10}
            value={config.system}
            maxLength={AGENT_LIMITS.system}
            onChange={(system) => onChange({ ...config, system })}
            width="100%"
          />
        </FormLayout>
      </PageSection>
      <PageSection title="Tools">
        <CheckboxList
          label="Tools"
          isLabelHidden
          hasDividers
          value={[...config.tools]}
          onChange={(tools) => onChange({ ...config, tools: tools as ToolGroup[] })}
        >
          {TOOL_GROUPS.map(({ group, label, description }) => (
            <CheckboxListItem key={group} value={group} label={label} description={description} />
          ))}
        </CheckboxList>
        <FormLayout>
          <NumberInput
            label="Tool rounds per answer"
            description="It stops after this many rounds of tool use."
            value={config.maxTurns}
            onChange={(maxTurns) => onChange({ ...config, maxTurns })}
            min={1}
            max={AGENT_LIMITS.maxTurns}
            isIntegerOnly
          />
        </FormLayout>
      </PageSection>
    </>
  );
}

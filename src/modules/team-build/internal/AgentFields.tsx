import { type ComponentType, Fragment } from "react";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { AGENT_SETTINGS, type AgentConfig, type AgentSetting, THINKING, TOOL_IDS, TOOLS } from "~/modules/agents/types.ts";
import type { AgentOptions, ModelOption } from "../types.ts";

/** What the workspace has for an agent to be given. */
export interface Choices {
  readonly models: readonly ModelOption[];
  readonly skills: readonly string[];
  readonly environments: AgentOptions["environments"];
}

interface FieldProps<Value> {
  readonly value: Value;
  readonly onChange: (value: Value) => void;
  readonly isDisabled: boolean;
  readonly choices: Choices;
}
type Field<K extends AgentSetting> = ComponentType<FieldProps<AgentConfig[K]>>;

const DEFAULT_MODEL = "default";
const PLAIN = "none";
const capital = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

const Name: Field<"name"> = ({ choices: _none, ...props }) => <TextInput label="Name" {...props} width="100%" isRequired />;

const Instructions: Field<"instructions"> = ({ choices: _none, ...props }) => (
  <TextArea label="Instructions" rows={10} {...props} hasSpellCheck={false} width="100%" />
);

const Model: Field<"model"> = ({ value, onChange, isDisabled, choices }) => (
  <Selector
    label="Model"
    options={[
      { value: DEFAULT_MODEL, label: "The workspace's default model" },
      ...choices.models.flatMap(({ connectionId, label, models }) =>
        models.map((model) => ({ value: `${connectionId}|${model}`, label: `${model} · ${label}` })),
      ),
    ]}
    value={value === null ? DEFAULT_MODEL : `${value.connectionId}|${value.model}`}
    isDisabled={isDisabled}
    onChange={(chosen) => {
      const [connectionId = "", ...rest] = (chosen ?? DEFAULT_MODEL).split("|");
      onChange(chosen === undefined || chosen === DEFAULT_MODEL ? null : { connectionId, model: rest.join("|") });
    }}
    width="100%"
  />
);

const Thinking: Field<"thinking"> = ({ value, onChange, isDisabled }) => (
  <>
    <Text weight="medium">Thinking</Text>
    <SegmentedControl
      label="Thinking"
      value={value}
      isDisabled={isDisabled}
      onChange={(chosen) => onChange(THINKING.find((level) => level === chosen) ?? value)}
    >
      {THINKING.map((level) => (
        <SegmentedControlItem key={level} value={level} label={capital(level)} />
      ))}
    </SegmentedControl>
  </>
);

/** A tool no run has yet is not offered; one saved through the API stays as it is. */
const Tools: Field<"tools"> = ({ value, onChange, isDisabled }) => (
  <CheckboxList
    label="Tools"
    value={[...value]}
    isDisabled={isDisabled}
    onChange={(chosen) => onChange(TOOL_IDS.filter((tool) => chosen.includes(tool)))}
  >
    {TOOL_IDS.filter((tool) => TOOLS[tool].built).map((tool) => (
      <CheckboxListItem key={tool} value={tool} label={tool} description={TOOLS[tool].label} />
    ))}
  </CheckboxList>
);

const Skills: Field<"skills"> = ({ value, onChange, isDisabled, choices }) =>
  choices.skills.length === 0 ? (
    <Text color="secondary">No skills yet. Make one under Skills, then add it here.</Text>
  ) : (
    <CheckboxList label="Skills" value={[...value]} isDisabled={isDisabled} onChange={onChange}>
      {choices.skills.map((name) => (
        <CheckboxListItem key={name} value={name} label={name} />
      ))}
    </CheckboxList>
  );

const Environment: Field<"environment"> = ({ value, onChange, isDisabled, choices }) => (
  <Selector
    label="Environment"
    options={[
      { value: PLAIN, label: "None: the plain container" },
      ...choices.environments.map(({ id, name }) => ({ value: id, label: name })),
    ]}
    value={value ?? PLAIN}
    isDisabled={isDisabled}
    onChange={(chosen) => onChange(chosen === undefined || chosen === PLAIN ? null : chosen)}
    width="100%"
  />
);

/** One control per setting of an agent. A setting with none here does not compile. */
const FIELDS: { readonly [K in AgentSetting]: Field<K> } = {
  name: Name,
  instructions: Instructions,
  model: Model,
  thinking: Thinking,
  tools: Tools,
  skills: Skills,
  environment: Environment,
};
const SETTINGS = Object.keys(AGENT_SETTINGS) as readonly AgentSetting[];

interface AgentFieldsProps {
  readonly config: AgentConfig;
  readonly onChange: (config: AgentConfig) => void;
  readonly isDisabled: boolean;
  readonly choices: Choices;
}

function fieldFor<K extends AgentSetting>(setting: K, { config, onChange, isDisabled, choices }: AgentFieldsProps) {
  const One: Field<K> = FIELDS[setting];
  return (
    <One
      value={config[setting]}
      onChange={(value) => onChange({ ...config, [setting]: value })}
      isDisabled={isDisabled}
      choices={choices}
    />
  );
}

/** Every setting of an agent, in the order the agents module has them. */
export function AgentFields(props: AgentFieldsProps) {
  return SETTINGS.map((setting) => <Fragment key={setting}>{fieldFor(setting, props)}</Fragment>);
}

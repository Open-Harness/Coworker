// astryx-template: settings
import { useState } from "react";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import type { KeysView } from "~/modules/views-workspace/types.ts";
import { capital, say } from "../manager-frame/words.ts";

type Connection = KeysView["models"][number];
export type Model = Connection["models"][number];

/** The empty answer: use the one above. */
export const INHERIT = "";
/** A model as one answer: where it is connected, and which it is. */
export const keyOf = (model: Pick<Model, "connection" | "model">): string => `${model.connection}/${model.model}`;

const price = (model: Model | undefined): string => {
  const cost = model?.price;
  return cost == null ? "Price not known" : `${say("dollars", cost.input)} in, ${say("dollars", cost.output)} out, per million tokens`;
};

/** One way to choose a model, thinking level included, for a manager that follows the workspace until it chooses its own. */
export function ModelPicker(props: {
  readonly connections: readonly Connection[];
  readonly value: string;
  readonly above: Model | undefined;
  readonly aboveName: string;
  readonly thinking: string;
  readonly onChange: (model: string) => void;
  readonly onThinking: (level: string) => void;
}) {
  const { connections, value, above, aboveName, thinking, onChange, onThinking } = props;
  const all = connections.flatMap((one) => one.models);
  const chosen = value === INHERIT ? above : all.find((one) => keyOf(one) === value);
  const levels = chosen?.levels ?? ["off", "low", "medium", "high"];
  const [level, setLevel] = useState(thinking);
  const options = [
    { value: INHERIT, label: `${aboveName} (${above?.name ?? "none"})` },
    ...connections.map((one) => ({
      type: "section" as const,
      title: one.label,
      options: one.models.map((model) => ({ value: keyOf(model), label: model.name })),
    })),
  ];
  return (
    <VStack gap={2}>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <VStack style={{ flex: "2 1 220px", minWidth: 0 }}>
          <Selector label="Model" value={value} onChange={(next) => onChange(next ?? INHERIT)} options={options} />
        </VStack>
        <VStack style={{ flex: "1 1 120px", minWidth: 0 }}>
          <Selector
            label="Thinking"
            value={levels.includes(level as never) ? level : (levels[0] ?? thinking)}
            onChange={(next) => {
              setLevel(next ?? thinking);
              onThinking(next ?? thinking);
            }}
            options={levels.map((one) => ({ value: one, label: capital(one) }))}
          />
        </VStack>
      </HStack>
      <Text type="supporting" color="secondary">
        {price(chosen)}
      </Text>
    </VStack>
  );
}

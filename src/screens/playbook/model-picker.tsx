// astryx-template: settings
import { useState } from "react";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import type { ModelChoice } from "~/modules/playbook/types.ts";
import type { KeysView } from "~/modules/views-workspace/types.ts";
import { money, upper } from "./words.ts";

type Model = KeysView["models"][number]["models"][number];
/** The empty answer: use the one above. */
const INHERIT = "";
const LEVELS = ["off", "low", "medium", "high"] as const;
const keyOf = (m: Pick<Model, "connection" | "model">): string => `${m.connection}/${m.model}`;
/** What the playbook stores for an agent's model, as the picker's value. */
export const valueOf = (choice: ModelChoice): string => (choice === "inherit" ? INHERIT : keyOf(choice));

interface Props {
  readonly value: string;
  readonly onChange: (model: string) => void;
  /** What the workspace has connected: the models to choose from, what each costs, and the thinking each has. */
  readonly keys: KeysView;
  readonly thinking: string;
  readonly onThinking?: (level: string) => void;
  readonly aboveName?: string;
}

/** One way to choose a model, thinking level included, wherever an agent or a manager has one. */
export function ModelPicker({ value, onChange, keys, thinking, onThinking, aboveName = "The manager’s" }: Props) {
  const [level, setLevel] = useState<string>(thinking);
  const all = keys.models.flatMap((c) => c.models);
  const chosen = all.find((m) => keyOf(m) === value);
  const options = [
    { value: INHERIT, label: aboveName },
    ...keys.models.map((c) => ({
      type: "section" as const,
      title: c.label,
      options: c.models.map((m) => ({ value: keyOf(m), label: m.name })),
    })),
  ];
  const levels = [...new Set([...(chosen?.levels ?? LEVELS), level])];
  return (
    <VStack gap={2}>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <VStack style={{ flex: "2 1 220px", minWidth: 0 }}>
          <Selector label="Model" value={value} onChange={(v) => onChange(v ?? INHERIT)} options={options} />
        </VStack>
        <VStack style={{ flex: "1 1 120px", minWidth: 0 }}>
          <Selector
            label="Thinking"
            value={level}
            onChange={(v) => {
              setLevel(v ?? thinking);
              onThinking?.(v ?? thinking);
            }}
            options={levels.map((t) => ({ value: t, label: upper(t) }))}
          />
        </VStack>
      </HStack>
      {chosen?.price !== undefined && (
        <Text
          type="supporting"
          color="secondary"
        >{`${money(chosen.price.input)} in, ${money(chosen.price.output)} out, per million tokens`}</Text>
      )}
    </VStack>
  );
}

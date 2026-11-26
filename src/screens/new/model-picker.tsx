// astryx-template: form-wizard
import { useState } from "react";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import type { KeysView } from "~/modules/views-workspace/types.ts";

type Model = KeysView["models"][number]["models"][number];
const THINKING = ["Off", "Low", "Medium", "High"] as const;
/** The empty answer: use the one above. */
const INHERIT = "";
const money = (n: number) => `$${n < 1 ? n.toFixed(2) : n}`;
const price = (m: Model | undefined) =>
  m?.price === undefined ? "Price not known" : `${money(m.price.input)} in, ${money(m.price.output)} out, per million tokens`;
const cap = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** One way to choose a model, thinking level included: the workspace's own unless another of the connected ones is picked. */
export function ModelPicker({
  keys,
  label,
  value,
  onChange,
}: {
  keys: KeysView;
  label: string;
  value: string;
  onChange: (model: string) => void;
}) {
  const all = keys.models.flatMap((c) => c.models);
  const choice = keys.choice === null || keys.choice === "inherit" ? null : keys.choice;
  const above = all.find((m) => m.model === choice?.model && m.connection === choice?.connection);
  const [level, setLevel] = useState<string | undefined>(undefined);
  const chosen = value === INHERIT ? above : all.find((m) => m.name === value);
  const levels = (chosen?.levels ?? THINKING.map((t) => t.toLowerCase())).map(cap);
  const initial = choice === null ? "Medium" : cap(choice.thinking);
  const shown = level !== undefined && levels.includes(level) ? level : levels.includes(initial) ? initial : (levels[0] ?? initial);
  const options = [
    { value: INHERIT, label: `The workspace’s (${above?.name ?? "none"})` },
    ...keys.models.map((c) => ({
      type: "section" as const,
      title: c.label,
      options: c.models.map((m) => ({ value: m.name, label: m.name })),
    })),
  ];
  return (
    <VStack gap={2}>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <VStack style={{ flex: "2 1 220px", minWidth: 0 }}>
          <Selector label={label} value={value} onChange={(v) => onChange(v ?? INHERIT)} options={options} />
        </VStack>
        <VStack style={{ flex: "1 1 120px", minWidth: 0 }}>
          <Selector
            label="Thinking"
            value={shown}
            onChange={(v) => setLevel(v ?? shown)}
            options={levels.map((t) => ({ value: t, label: t }))}
          />
        </VStack>
      </HStack>
      <Text type="supporting" color="secondary">
        {price(chosen)}
      </Text>
    </VStack>
  );
}

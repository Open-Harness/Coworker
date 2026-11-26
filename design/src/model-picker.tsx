import { useState } from "react";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";

/** What the workspace connected, and what each model costs per million tokens in and out. `null`: not known. */
export interface Model { readonly name: string; readonly price: readonly [number, number] | null }
export interface Connection { readonly name: string; readonly models: readonly Model[] }
export const CONNECTIONS: readonly Connection[] = [
  { name: "Anthropic key", models: [{ name: "Claude Opus 5.5", price: [15, 75] }, { name: "Claude Sonnet 5.5", price: [3, 15] }, { name: "Claude Haiku 5.5", price: [1, 5] }] },
  { name: "OpenAI key", models: [{ name: "GPT-5.2", price: [2, 10] }, { name: "GPT-5.2 mini", price: [0.4, 2] }] },
  { name: "Our own server", models: [{ name: "Qwen 3 32B", price: null }] },
];
export const THINKING = ["Off", "Low", "Medium", "High"] as const;
/** The empty answer: use the one above. */
export const INHERIT = "";
const ALL = CONNECTIONS.flatMap((c) => c.models);
const money = (n: number) => `$${n < 1 ? n.toFixed(2) : n}`;
const price = (m: Model | undefined) => (m?.price == null ? "Price not known" : `${money(m.price[0])} in, ${money(m.price[1])} out, per million tokens`);

interface Props {
  readonly value: string; readonly onChange: (model: string) => void;
  /** What the empty answer means, and whose it is. */
  readonly above?: string; readonly aboveName?: string;
  /** `false`: there is nothing above to follow (the workspace default), so every model is a plain choice. */
  readonly inherit?: boolean;
  /** The thinking levels a model has. All four when not given. */
  readonly levelsOf?: (model: string) => readonly string[];
  readonly label?: string; readonly thinking?: (typeof THINKING)[number]; readonly onThinking?: (level: string) => void;
}

/** One way to choose a model, thinking level included, wherever an agent or a manager has one. */
export function ModelPicker({ value, onChange, above = "Claude Sonnet 5.5", aboveName = "The manager’s", inherit = true, levelsOf, label = "Model", thinking = "Medium", onThinking }: Props) {
  const [level, setLevel] = useState<string>(thinking);
  const chosen = ALL.find((m) => m.name === (value === INHERIT ? above : value));
  const levels = levelsOf?.(chosen?.name ?? above) ?? THINKING;
  const options = [
    ...(inherit ? [{ value: INHERIT, label: `${aboveName} (${above})` }] : []),
    ...CONNECTIONS.map((c) => ({ type: "section" as const, title: c.name, options: c.models.map((m) => ({ value: m.name, label: m.name })) })),
  ];
  return (
    <VStack gap={2}>
      <HStack gap={3} wrap="wrap" vAlign="end">
        <VStack style={{ flex: "2 1 220px", minWidth: 0 }}><Selector label={label} value={value} onChange={(v) => onChange(v ?? INHERIT)} options={options} /></VStack>
        <VStack style={{ flex: "1 1 120px", minWidth: 0 }}><Selector label="Thinking" value={levels.includes(level as never) ? level : (levels[0] ?? thinking)} onChange={(v) => { setLevel(v ?? thinking); onThinking?.(v ?? thinking); }} options={levels.map((t) => ({ value: t, label: t }))} /></VStack>
      </HStack>
      <Text type="supporting" color="secondary">{price(chosen)}</Text>
    </VStack>
  );
}

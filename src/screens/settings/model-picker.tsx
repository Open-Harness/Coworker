// astryx-template: ai-chat
import { useState } from "react";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import type { KeysView } from "~/modules/views-workspace/types.ts";
import { capital } from "./format.ts";

/** What the workspace connected: each connection and its models, with what they cost per million tokens in and out. */
export type Connections = KeysView["models"];
type Found = Connections[number]["models"][number];

/** The empty answer: use the one above. */
export const INHERIT = "";
const LEVELS = ["off", "low", "medium", "high"] as const;
const money = (n: number): string => `$${n < 1 ? n.toFixed(2) : String(n)}`;

export const modelsOf = (connections: Connections): readonly Found[] => connections.flatMap((one) => [...one.models]);
export const nameOf = (connections: Connections, choice: { readonly connection: string; readonly model: string }): string =>
  modelsOf(connections).find((one) => one.connection === choice.connection && one.model === choice.model)?.name ?? choice.model;
export const levelsOf = (connections: Connections, name: string): readonly string[] =>
  (modelsOf(connections).find((one) => one.name === name)?.levels ?? LEVELS).map(capital);

const priceOf = (found: Found | undefined): string =>
  found?.price === undefined ? "Price not known" : `${money(found.price.input)} in, ${money(found.price.output)} out, per million tokens`;

interface Props {
  readonly connections: Connections;
  readonly value: string;
  readonly onChange: (model: string) => void;
  /** What the empty answer means, and whose it is. */
  readonly above?: string;
  readonly aboveName?: string;
  /** `false`: there is nothing above to follow (the workspace default), so every model is a plain choice. */
  readonly inherit?: boolean;
  readonly label?: string;
  readonly thinking?: string;
  readonly onThinking?: (level: string) => void;
}

/** One way to choose a model, thinking level included, wherever an agent or a manager has one. */
export function ModelPicker({
  connections,
  value,
  onChange,
  above = "",
  aboveName = "The manager’s",
  inherit = true,
  label = "Model",
  thinking = "Medium",
  onThinking,
}: Props) {
  const [level, setLevel] = useState<string>(thinking);
  const chosen = modelsOf(connections).find((one) => one.name === (value === INHERIT ? above : value));
  const levels = levelsOf(connections, chosen?.name ?? above);
  const options = [
    ...(inherit ? [{ value: INHERIT, label: `${aboveName} (${above})` }] : []),
    ...connections.map((one) => ({
      type: "section" as const,
      title: one.label,
      options: one.models.map((m) => ({ value: m.name, label: m.name })),
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
            value={levels.includes(level) ? level : (levels[0] ?? thinking)}
            onChange={(v) => {
              setLevel(v ?? thinking);
              onThinking?.(v ?? thinking);
            }}
            options={levels.map((t) => ({ value: t, label: t }))}
          />
        </VStack>
      </HStack>
      <Text type="supporting" color="secondary">
        {priceOf(chosen)}
      </Text>
    </VStack>
  );
}

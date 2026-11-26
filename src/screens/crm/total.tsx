import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";

const VALUE_WIDTH = 132;

export function TotalRow({ label, value, emphasis }: { label: string; value: string; emphasis?: "muted" | "strong" }) {
  const weight = emphasis === "strong" ? "semibold" : "normal";
  return (
    <HStack gap={6} hAlign="end" vAlign="center">
      <Text weight={weight} color={emphasis === "muted" ? "secondary" : "primary"}>
        {label}
      </Text>
      <VStack width={VALUE_WIDTH}>
        <Text justify="end" display="block" hasTabularNumbers weight={weight}>
          {value}
        </Text>
      </VStack>
    </HStack>
  );
}

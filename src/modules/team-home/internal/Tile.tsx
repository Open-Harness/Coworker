import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";

/** One headline number and what it counts. */
export function Tile({ label, value, note }: { readonly label: string; readonly value: number; readonly note: string }) {
  return (
    <Card padding={4} height="100%">
      <VStack gap={1}>
        <Text type="label" color="secondary">
          {label}
        </Text>
        <Heading level={2} accessibilityLevel={3}>
          {value.toLocaleString()}
        </Heading>
        <Text type="supporting" color="secondary">
          {note}
        </Text>
      </VStack>
    </Card>
  );
}

export const plural = (count: number, one: string, many = `${one}s`): string => `${count} ${count === 1 ? one : many}`;

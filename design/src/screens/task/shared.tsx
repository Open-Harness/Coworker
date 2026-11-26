import type { ReactNode } from "react";
import { HStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";

// A Section escapes its container's padding by design — it cancels
// --container-padding-* with negative margins so fills can run edge to edge.
// LayoutContent's own padding is therefore invisible in the main column; this
// is the value that actually sets its inset.
export const SECTION_PADDING = 6;

export function SectionHeader({ title, level = 2, action }: { title: string; level?: 2 | 3; action?: ReactNode }) {
  return (
    <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
      <Heading level={level}>{title}</Heading>
      {action}
    </HStack>
  );
}

export function PersonRow({ name }: { name: string }) {
  return (
    <HStack gap={2} vAlign="center">
      <Avatar name={name} size="xsm" />
      <Text type="body">{name}</Text>
    </HStack>
  );
}

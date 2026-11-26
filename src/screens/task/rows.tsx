// astryx-template: work-item-detail
import type { ComponentType, ReactNode, SVGProps } from "react";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";

// A fixed square tile the row's icon centres in. AspectRatio keeps it square; the width is what stops it growing with the row.
const TILE = { width: 40, backgroundColor: "var(--color-background-muted)", borderRadius: "var(--radius-element)" } as const;

/** One row of a list of things that opened elsewhere: an icon tile, a title, two lines under it, and something at the end. */
export function RowCard(props: {
  readonly label: string;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly title: string;
  readonly titleExtra?: ReactNode;
  readonly lines: readonly string[];
  readonly end?: ReactNode;
}) {
  const { label, href, onClick, icon, title, titleExtra, lines, end } = props;
  return (
    <ClickableCard label={label} {...(href ? { href } : {})} {...(onClick ? { onClick } : {})} padding={3}>
      <HStack gap={4} vAlign="center" width="100%">
        <AspectRatio ratio={1} fit="center" style={TILE}>
          <Icon icon={icon} size="lg" color="secondary" />
        </AspectRatio>
        <StackItem size="fill">
          <VStack gap={0}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Text type="body" weight="semibold">
                {title}
              </Text>
              {titleExtra}
            </HStack>
            {lines.map((line) => (
              <Text key={line} type="supporting" color="secondary">
                {line}
              </Text>
            ))}
          </VStack>
        </StackItem>
        {end}
      </HStack>
    </ClickableCard>
  );
}

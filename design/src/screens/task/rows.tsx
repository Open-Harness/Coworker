import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { colorVars, radiusVars } from "@astryxdesign/core/theme/tokens.stylex";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { AspectRatio } from "@astryxdesign/core/AspectRatio";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import type { ComponentType, SVGProps } from "react";

const styles = stylex.create({
  // Fixed square tile the row's icon centers in. AspectRatio keeps it
  // square; the width is what stops it growing with the row.
  tile: {
    width: 40,
    backgroundColor: colorVars["--color-background-muted"],
    borderRadius: radiusVars["--radius-element"],
  },
});

/** One row of a list of things that opened elsewhere: an icon tile, a title, two lines under it, and something at the end. */
export function RowCard({ label, href, onClick, icon, title, titleExtra, lines, end }: {
  label: string; href?: string; onClick?: () => void; icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string; titleExtra?: ReactNode; lines: readonly string[]; end?: ReactNode;
}) {
  return (
    <ClickableCard label={label} {...(href ? { href } : {})} {...(onClick ? { onClick } : {})} padding={3}>
      <HStack gap={4} vAlign="center" width="100%">
        <AspectRatio ratio={1} fit="center" xstyle={styles.tile}>
          <Icon icon={icon} size="lg" color="secondary" />
        </AspectRatio>
        <StackItem size="fill">
          <VStack gap={0}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Text type="body" weight="semibold">{title}</Text>
              {titleExtra}
            </HStack>
            {lines.map((l) => <Text key={l} type="supporting" color="secondary">{l}</Text>)}
          </VStack>
        </StackItem>
        {end}
      </HStack>
    </ClickableCard>
  );
}

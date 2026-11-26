// astryx-template: dashboard-scorecard
import { VStack, HStack } from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { ArrowUpIcon, ArrowDownIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import type { Tile } from "~/modules/views-workspace/types.ts";
import { changeOf, MEANS, ragFor, valueOf, type Rag } from "./figures.ts";

export const RAG_ICON: Record<Rag, "success" | "warning" | "error"> = { green: "success", amber: "warning", red: "error" };
const DELTA_ICON = { up: ArrowUpIcon, down: ArrowDownIcon, flat: ArrowRightIcon };

/** One number, what it counts, and how it moved against the period before. */
export function ScorecardTile({ tile }: { readonly tile: Tile }) {
  const { delta, text } = changeOf(tile);
  const rag = ragFor(delta, tile.better === "more");
  const direction = delta === 0 ? "flat" : delta < 0 ? "down" : "up";
  return (
    <Card padding={5}>
      <VStack gap={1}>
        <Text type="label" color="secondary">
          {tile.label}
        </Text>
        <HStack gap={4} vAlign="center" wrap="wrap">
          <Heading level={2} accessibilityLevel={3}>
            {valueOf(tile)}
          </Heading>
          <HStack gap={2} vAlign="center">
            <Text type="body" color="secondary">
              {text}
            </Text>
            <Icon icon={DELTA_ICON[direction]} size="xsm" color={RAG_ICON[rag]} />
          </HStack>
        </HStack>
        <Text type="supporting" color="secondary">
          {MEANS[tile.id] ?? ""}
        </Text>
      </VStack>
    </Card>
  );
}

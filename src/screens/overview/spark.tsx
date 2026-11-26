// astryx-template: dashboard-alert-rail
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { aimOf, beforeOf, readOf, valueOf, type Measure } from "./measure.ts";

const SPARK = { good: "var(--color-text-success)", behind: "var(--color-text-warning)", "not yet": "var(--color-text-secondary)" } as const;
const SAYS = { good: "As it should be", behind: "Behind", "not yet": "Not yet" } as const;
const WIDE = 100;
const HIGH = 32;

/** The last weeks of one number as a line, fitted to its own range. */
function Sparkline({ points, color }: { readonly points: readonly number[]; readonly color: string }) {
  const [low, top] = [Math.min(...points), Math.max(...points)];
  const span = top === low ? 1 : top - low;
  const d = points
    .map(
      (value, i) =>
        `${i === 0 ? "M" : "L"}${((i / Math.max(1, points.length - 1)) * WIDE).toFixed(2)} ${(HIGH - 2 - ((value - low) / span) * (HIGH - 4)).toFixed(2)}`,
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${WIDE} ${HIGH}`} preserveAspectRatio="none" width="100%" height={40} role="application">
      <path d={d} fill="none" stroke={color} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** One measure: what it is, what it was before the manager, what it should be. No number stands in for one that is not there yet. */
export function MeasureTile({ measure, zone }: { readonly measure: Measure; readonly zone: string }) {
  const { is, tile } = measure;
  const dot = is === "good" ? "success" : is === "behind" ? "warning" : "neutral";
  const isDown = tile.better === "less";
  return (
    <Card padding={4}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <StatusDot variant={dot} label={SAYS[is]} tooltip={SAYS[is]} />
          <Text type="label" color="secondary">
            {tile.label}
          </Text>
        </HStack>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Heading level={2}>{valueOf(measure)}</Heading>
          {is === "not yet" ? null : (
            <HStack gap={1} vAlign="center">
              <Icon icon={isDown ? ArrowDownIcon : ArrowUpIcon} size="xsm" color="success" />
              <Text type="supporting" color="secondary">{`from ${beforeOf(measure).split(",")[0] ?? ""}`}</Text>
            </HStack>
          )}
        </HStack>
        {tile.points.length > 1 ? (
          <Sparkline points={tile.points} color={SPARK[is]} />
        ) : (
          <Text type="supporting" color="secondary">
            {readOf(measure).split(". ").at(-1)}
          </Text>
        )}
        <Text type="supporting" color="secondary">
          {aimOf(measure, zone)}
        </Text>
      </VStack>
    </Card>
  );
}

// astryx-template: dashboard-alert-rail
import type { CSSProperties } from "react";
import { Card } from "@astryxdesign/core/Card";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";

export interface Line {
  readonly name: string;
  readonly color: string;
  readonly values: readonly (number | null)[];
  readonly isDashed?: boolean;
}

const HEIGHT = 280;
const GUTTER = { left: 40, right: 16, top: 12, bottom: 28 } as const;
const TEXT: CSSProperties = {
  position: "absolute",
  fontSize: "var(--font-size-sm)",
  color: "var(--color-text-secondary)",
  whiteSpace: "nowrap",
};
const WIDE = 1000;

/** Four steps up from zero, each a whole number: 0 3 6 9 12 for a top of 10. */
function ticksFor(top: number): readonly number[] {
  const step = Math.max(1, Math.ceil(top / 4));
  return [0, 1, 2, 3, 4].map((one) => one * step);
}

function LegendDot({ color, label }: { readonly color: string; readonly label: string }) {
  return (
    <HStack gap={2} vAlign="center">
      <svg width={10} height={10} aria-hidden>
        <path d="M0 0h10v10H0z" fill={color} />
      </svg>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
    </HStack>
  );
}

/** One time-series card: title, plot, legend, driven by a list of lines. Drawn as it is read: the numbers are the labels. */
export function MetricChart({
  title,
  subtitle,
  labels,
  lines,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly labels: readonly string[];
  readonly lines: readonly Line[];
}) {
  const ticks = ticksFor(Math.max(1, ...lines.flatMap((line) => line.values.filter((value): value is number => value !== null))));
  const top = ticks.at(-1) ?? 1;
  const last = Math.max(1, labels.length - 1);
  const [x, y] = [(i: number): number => (i / last) * WIDE, (value: number): number => (1 - value / top) * HEIGHT];
  const shown = labels.length <= 4 ? labels.map((_, i) => i) : labels.map((_, i) => i).filter((i) => i % 2 === 1);
  return (
    <Card padding={6}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>{title}</Heading>
          <Text type="supporting" color="secondary">
            {subtitle}
          </Text>
        </VStack>
        <VStack role="application" style={{ position: "relative", height: HEIGHT + GUTTER.top + GUTTER.bottom }}>
          <VStack gap={0} style={{ position: "absolute", inset: `${GUTTER.top}px ${GUTTER.right}px ${GUTTER.bottom}px ${GUTTER.left}px` }}>
            <svg width="100%" height="100%" viewBox={`0 0 ${WIDE} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden>
              {ticks.map((tick) => (
                <path
                  key={tick}
                  d={`M0 ${y(tick)}H${WIDE}`}
                  stroke="var(--color-border)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  fill="none"
                />
              ))}
              {lines.map((line) => (
                <path
                  key={line.name}
                  d={line.values
                    .flatMap((value, i) =>
                      value === null ? [] : [`${i === 0 || line.values[i - 1] === null ? "M" : "L"}${x(i)} ${y(value)}`],
                    )
                    .join(" ")}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={1.5}
                  strokeLinejoin="miter"
                  vectorEffect="non-scaling-stroke"
                  {...(line.isDashed === true ? { strokeDasharray: "4 4" } : {})}
                />
              ))}
            </svg>
            {shown.map((i) => (
              <VStack
                gap={0}
                key={i}
                style={{
                  ...TEXT,
                  insetBlockStart: "100%",
                  paddingBlockStart: 8,
                  insetInlineStart: `${(i / last) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                {labels[i]}
              </VStack>
            ))}
            {ticks.map((tick) => (
              <VStack
                gap={0}
                key={tick}
                style={{
                  ...TEXT,
                  insetInlineEnd: "100%",
                  paddingInlineEnd: 8,
                  top: `${(1 - tick / top) * 100}%`,
                  transform: "translateY(-50%)",
                }}
              >
                {tick}
              </VStack>
            ))}
          </VStack>
        </VStack>
        <HStack gap={6} vAlign="center" wrap="wrap">
          {lines.map((line) => (
            <LegendDot key={line.name} color={line.color} label={line.name} />
          ))}
        </HStack>
      </VStack>
    </Card>
  );
}

import { useMemo, type CSSProperties } from "react";
import { VStack, HStack } from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";
import { StopIcon } from "@heroicons/react/24/solid";
import type { Measure } from "./measures";

export interface Series { labels: readonly string[]; ticks: number[] }

// Inline color: Icon's `color` prop only takes semantic names.
export function LegendDot({ color, label }: { color: string; label: string }) {
  const dotStyle: CSSProperties = { color };
  return (
    <HStack gap={2} vAlign="center">
      <Icon icon={StopIcon} size="xsm" style={dotStyle} />
      <Text type="supporting" color="secondary">{label}</Text>
    </HStack>
  );
}

interface TooltipEntry { name: string; value: number; color: string }

// Recharts passes the point index as `label`; map it back to a day or an hour.
function ChartTooltip({ active, payload, label, series, unit }: { active?: boolean; payload?: TooltipEntry[]; label?: number; series: Series; unit: string }) {
  if (!active || !payload?.length) return null;
  const timeLabel = typeof label === "number" ? (series.labels[label] ?? "") : "";
  return (
    <Card padding={3}>
      <VStack gap={1}>
        <Text type="supporting" color="secondary">{timeLabel}</Text>
        {payload.filter((e) => e.value !== null).map((entry) => <LegendDot key={entry.name} color={entry.color} label={`${entry.name}: ${entry.value.toLocaleString()}${unit}`} />)}
      </VStack>
    </Card>
  );
}

const AXIS_TICK = { fontSize: "var(--font-size-sm)", fill: "var(--color-text-secondary)" };
const GRID_STROKE = "var(--color-border)";
// Shared so both cards in the grid row align. The margins reserve the overhang
// of centered axis ticks, without which the tallest y-label is clipped.
const CHART_HEIGHT = 280;
const CHART_MARGIN = { top: 12, right: 16, left: 0, bottom: 4 };
const Y_AXIS_WIDTH = 40;

// `linear` + miter joins keep every sample a straight segment.
const LINE_PROPS = { type: "linear", strokeLinejoin: "miter", strokeLinecap: "butt", dot: false, isAnimationActive: false } as const;

export interface ChartLine { key: string; name: string; color: string; values: readonly (number | null)[]; isDashed?: boolean }

/** One time-series card: title, plot, legend, driven by a list of lines. */
export function MetricChart({ title, subtitle, series, lines, unit }: { title: string; subtitle: string; series: Series; lines: ChartLine[]; unit: string }) {
  const data = useMemo(() => series.labels.map((_, t) => Object.fromEntries([["t", t], ...lines.map((l) => [l.key, l.values[t] ?? null])])), [series, lines]);
  return (
    <Card padding={6}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>{title}</Heading>
          <Text type="supporting" color="secondary">{subtitle}</Text>
        </VStack>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid horizontal vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="t" type="number" domain={[0, series.labels.length - 1]} ticks={series.ticks} tickFormatter={(v: number) => series.labels[v] ?? ""} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={Y_AXIS_WIDTH} allowDecimals={false} />
            <Tooltip content={<ChartTooltip series={series} unit={unit} />} cursor={{ stroke: GRID_STROKE }} />
            {lines.map((l) => <Line {...LINE_PROPS} key={l.key} dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={1.5} {...(l.isDashed ? { strokeDasharray: "4 4" } : {})} />)}
          </LineChart>
        </ResponsiveContainer>
        <HStack gap={6} vAlign="center" wrap="wrap">
          {lines.map((l) => <LegendDot key={l.key} color={l.color} label={l.name} />)}
        </HStack>
      </VStack>
    </Card>
  );
}

// ============= TILE =============

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 2 }}>
        {/* Fit the scale to the data: the implicit axis anchors the domain at 0, which flattens a series far from zero. */}
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line {...LINE_PROPS} dataKey="v" stroke={color} strokeWidth={1.25} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const SPARK = { good: "var(--color-text-success)", behind: "var(--color-text-warning)", "not yet": "var(--color-text-secondary)" } as const;
const SAYS = { good: "As it should be", behind: "Behind", "not yet": "Not yet" } as const;

/** One measure: what it is, what it was before the manager, what it should be. No number stands in for one that is not there yet. */
export function MeasureTile({ m }: { m: Measure }) {
  return (
    <Card padding={4}>
      <VStack gap={2}>
        <HStack gap={2} vAlign="center">
          <StatusDot variant={m.state === "good" ? "success" : m.state === "behind" ? "warning" : "neutral"} label={SAYS[m.state]} tooltip={SAYS[m.state]} />
          <Text type="label" color="secondary">{m.name}</Text>
        </HStack>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Heading level={2}>{m.value}</Heading>
          {m.state !== "not yet" && (
            <HStack gap={1} vAlign="center">
              <Icon icon={m.isDown ? ArrowDownIcon : ArrowUpIcon} size="xsm" color="success" />
              <Text type="supporting" color="secondary">{`from ${m.before.split(",")[0]}`}</Text>
            </HStack>
          )}
        </HStack>
        {m.spark.length > 0 ? <Sparkline data={[...m.spark]} color={SPARK[m.state]} /> : <Text type="supporting" color="secondary">{m.read.split(". ").at(-1)}</Text>}
        <Text type="supporting" color="secondary">{m.aim}</Text>
      </VStack>
    </Card>
  );
}

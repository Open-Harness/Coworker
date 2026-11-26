import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import type { ChartColor, ChartSeries, DonutChartProps, SeriesChartProps } from "../types.ts";

/*
 * The only file that imports recharts: Astryx has no chart component, and its own dashboard templates use this library.
 * It draws and nothing else; `ChartFrame.tsx` names the chart, gives its numbers as text and loads this file on demand.
 * Colours are Astryx's data tokens, passed through recharts' own stroke and fill props, so dark mode follows the theme.
 */

const COLOR = (color: ChartColor): string => (color === "neutral" ? "var(--color-data-neutral)" : `var(--color-data-categorical-${color})`);
const TEXT = "var(--color-text-secondary)";
const GRID = "var(--color-border)";
const AXIS = { fontSize: 12, fill: TEXT };
const MARGIN = { top: 8, right: 8, left: 0, bottom: 0 };
const HEIGHT = 240;

/** Thirty labels do not fit side by side; recharts leaves out the ones that would touch. */
const X_AXIS = { tick: AXIS, axisLine: false, tickLine: false, interval: "preserveStartEnd", minTickGap: 24 } as const;
/** From zero to the next whole number above the biggest, so the ticks land on round values. */
const Y_AXIS = {
  tick: AXIS,
  axisLine: false,
  tickLine: false,
  width: 36,
  domain: [0, (top: number) => Math.max(1, Math.ceil(top))] as [number, (top: number) => number],
} as const;

interface Entry {
  readonly name?: string | number;
  readonly value?: number | string | readonly (number | string)[];
}

/** What a hovered step says, drawn with Astryx rather than recharts' own white box. */
function Hover({ active, payload, label, unit }: { active?: boolean; payload?: readonly Entry[]; label?: string | number; unit?: string }) {
  if (active !== true || payload === undefined || payload.length === 0) return null;
  return (
    <Card padding={3}>
      <VStack gap={1}>
        {label !== undefined && (
          <Text type="supporting" color="secondary">
            {String(label)}
          </Text>
        )}
        {payload.map(({ name, value }) => (
          <Text key={String(name)} type="supporting">{`${String(name)}: ${String(value)}${unit === undefined ? "" : ` ${unit}`}`}</Text>
        ))}
      </VStack>
    </Card>
  );
}

/** One row per label, one key per series: what recharts reads. */
const rowsOf = (labels: readonly string[], series: readonly ChartSeries[]): readonly Record<string, string | number>[] =>
  labels.map((label, index) => Object.fromEntries([["label", label], ...series.map(({ name, values }) => [name, values[index] ?? 0])]));

function Lines({ labels, series, unit, hasDecimals = false, height = HEIGHT }: SeriesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rowsOf(labels, series) as Record<string, string | number>[]} margin={MARGIN}>
        <CartesianGrid horizontal vertical={false} stroke={GRID} />
        <XAxis dataKey="label" {...X_AXIS} />
        <YAxis {...Y_AXIS} allowDecimals={hasDecimals} />
        <Tooltip content={<Hover {...(unit === undefined ? {} : { unit })} />} cursor={{ stroke: GRID }} />
        {series.map(({ name, color }) => (
          <Line
            key={name}
            dataKey={name}
            stroke={COLOR(color)}
            strokeWidth={2}
            type="linear"
            dot={labels.length <= 8}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function Bars({ labels, series, unit, isStacked = false, hasDecimals = false, height = HEIGHT, axis, lines = [], over }: SeriesChartProps) {
  const prefix = axis?.prefix ?? "";
  const scale =
    axis === undefined
      ? Y_AXIS
      : {
          ...Y_AXIS,
          width: 44,
          domain: [0, axis.top] as [number, number],
          ticks: [...axis.ticks],
          tickFormatter: (value: number) => `${prefix}${value}`,
        };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rowsOf(labels, series) as Record<string, string | number>[]} margin={MARGIN}>
        <CartesianGrid horizontal vertical={false} stroke={GRID} />
        <XAxis dataKey="label" {...X_AXIS} />
        <YAxis {...scale} allowDecimals={hasDecimals} />
        <Tooltip content={<Hover {...(unit === undefined ? {} : { unit })} />} cursor={{ fill: GRID, fillOpacity: 0.4 }} />
        {lines.map((at) => (
          <ReferenceLine key={at} y={at} stroke={TEXT} strokeDasharray="4 4" />
        ))}
        {series.map(({ name, color, values }) => (
          <Bar key={name} dataKey={name} fill={COLOR(color)} {...(isStacked ? { stackId: "all" } : {})} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {over === undefined || series.length > 1
              ? null
              : values.map((value, at) => <Cell key={labels[at] ?? at} fill={value >= over ? COLOR("red") : COLOR(color)} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function Donut({ slices, centre, height = HEIGHT }: DonutChartProps) {
  const shown = slices.filter(({ value }) => value > 0);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip content={<Hover />} />
        <Pie
          data={shown as { name: string; value: number }[]}
          dataKey="value"
          nameKey="name"
          innerRadius="62%"
          outerRadius="90%"
          paddingAngle={1}
          stroke="none"
          isAnimationActive={false}
        >
          {shown.map(({ name, color }) => (
            <Cell key={name} fill={COLOR(color)} />
          ))}
          {centre !== undefined && (
            <Label value={centre} position="center" fill="var(--color-text-primary)" fontSize={28} fontWeight={600} />
          )}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

/** A week against the week before, drawn day by day: the week as a line (or filled), the one before dashed and grey. */
export interface TrendProps {
  readonly labels: readonly string[];
  readonly now: readonly number[];
  readonly before: readonly number[];
  readonly color: ChartColor;
  readonly isFilled?: boolean;
  /** Short, for the axis: `$20`. */
  readonly format: (value: number) => string;
  readonly height?: number;
}

const TREND_TICK = { fontSize: "var(--font-size-sm)", fill: TEXT };
const TREND_MARGIN = { top: 5, right: 8, left: 0, bottom: 0 };

export function Trend({ labels, now, before, color, isFilled = false, format, height = 200 }: TrendProps) {
  const rows = labels.map((label, index) => ({ t: index, label, Now: now[index] ?? 0, Before: before[index] ?? 0 }));
  const stroke = COLOR(color);
  const ticks = labels.map((_, index) => index).filter((index) => index % 2 === 0);
  const axes = (
    <>
      <CartesianGrid horizontal vertical={false} stroke={GRID} />
      <XAxis
        dataKey="t"
        type="number"
        domain={[0, labels.length - 1]}
        ticks={ticks}
        tickFormatter={(index: number) => labels[index] ?? ""}
        tick={TREND_TICK}
        axisLine={false}
        tickLine={false}
      />
      <YAxis tick={TREND_TICK} axisLine={false} tickLine={false} width={52} tickFormatter={format} />
      <Tooltip content={<Hover />} cursor={{ stroke: GRID }} />
    </>
  );
  const earlier = {
    dataKey: "Before",
    stroke: TEXT,
    strokeWidth: 1,
    strokeDasharray: "4 4",
    dot: false,
    isAnimationActive: false,
    type: "linear",
  } as const;
  const current = { dataKey: "Now", stroke, strokeWidth: 2, dot: false, isAnimationActive: false, type: "linear" } as const;
  return (
    <ResponsiveContainer width="100%" height={height}>
      {isFilled ? (
        <AreaChart data={rows} margin={TREND_MARGIN}>
          {axes}
          <Area {...earlier} fill="none" />
          <Area {...current} fill={stroke} fillOpacity={0.15} />
        </AreaChart>
      ) : (
        <LineChart data={rows} margin={TREND_MARGIN}>
          {axes}
          <Line {...earlier} />
          <Line {...current} />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}

export type Drawing =
  | ({ readonly kind: "line" } & SeriesChartProps)
  | ({ readonly kind: "bar" } & SeriesChartProps)
  | ({ readonly kind: "donut" } & DonutChartProps);

export default function Chart(props: Drawing) {
  if (props.kind === "line") return <Lines {...props} />;
  if (props.kind === "bar") return <Bars {...props} />;
  return <Donut {...props} />;
}

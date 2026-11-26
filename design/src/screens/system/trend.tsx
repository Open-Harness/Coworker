'use client';

import {useMemo, type CSSProperties} from 'react';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Icon} from '@astryxdesign/core/Icon';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {StopIcon} from '@heroicons/react/24/outline';
import {deltaText, type TrendSeries} from './totals';

const PRIOR = 'var(--color-text-secondary)';
const GRID_STROKE = 'var(--color-border)';
const AXIS_TICK = {
  fontSize: 'var(--font-size-sm)',
  fill: 'var(--color-text-secondary)',
};

// Short tick labels ("6M", "350K") fit the fixed gutter with a small font up to
// 16 px, wide fonts included.
const Y_AXIS_WIDTH = 52;
const DAY_TICKS = [0, 2, 4, 6];

// Icon's `color` prop only accepts semantic names, but the legend swatch must
// match the exact data-categorical stroke of its chart line — so an inline
// color is required here (same pattern as the shipped dashboard templates).
function LegendDot({color, label}: {color: string; label: string}) {
  const dotStyle: CSSProperties = {color};
  return (
    <HStack gap={2} vAlign="center">
      <Icon icon={StopIcon} size="xsm" style={dotStyle} />
      <Text type="supporting" color="secondary">
        {label}
      </Text>
    </HStack>
  );
}

interface TrendTooltipEntry {
  name: string;
  value: number;
  color: string;
}

function makeTrendTooltip(
  exact: (v: number) => string,
  labelOf: (t: number) => string,
) {
  return function TrendTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TrendTooltipEntry[];
    label?: number;
  }) {
    if (!active || !payload?.length) {
      return null;
    }
    return (
      <Card padding={3}>
        <VStack gap={1}>
          <Text type="supporting" color="secondary">
            {typeof label === 'number' ? labelOf(label) : ''}
          </Text>
          {payload.map(entry => (
            <LegendDot
              key={entry.name}
              color={entry.color}
              label={`${entry.name}: ${exact(entry.value)}`}
            />
          ))}
        </VStack>
      </Card>
    );
  };
}

export function TrendChart({trend}: {trend: TrendSeries}) {
  const gradientId = `grad-${trend.key}`;
  const labelOf = (t: number) => trend.data[t]?.label ?? '';
  const TrendTooltip = useMemo(
    () => makeTrendTooltip(trend.exact, t => trend.data[t]?.label ?? ''),
    [trend],
  );
  const axes = (
    <>
      <CartesianGrid horizontal vertical={false} stroke={GRID_STROKE} />
      <XAxis
        dataKey="t"
        type="number"
        domain={[0, 6]}
        ticks={DAY_TICKS}
        tickFormatter={(v: number) => labelOf(v)}
        tick={AXIS_TICK}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={AXIS_TICK}
        axisLine={false}
        tickLine={false}
        width={Y_AXIS_WIDTH}
        tickFormatter={trend.format}
      />
      <Tooltip content={<TrendTooltip />} cursor={{stroke: GRID_STROKE}} />
    </>
  );
  return (
    <Card padding={5}>
      <VStack gap={6}>
        {/* On a narrow card the change line moves under the title instead of
            squeezing both into slivers. */}
        <HStack hAlign="between" vAlign="center" gap={2} wrap="wrap">
          <HStack gap={2}>
            <Heading level={3}>{trend.title}</Heading>
            <Heading level={3} color="secondary">
              {trend.headline}
            </Heading>
          </HStack>
          <Text type="supporting" color="secondary">
            {deltaText(trend.delta, trend.unit)} vs before
          </Text>
        </HStack>
        <ResponsiveContainer width="100%" height={200}>
          {trend.kind === 'area' ? (
            <AreaChart
              data={trend.data}
              margin={{top: 5, right: 8, left: 0, bottom: 0}}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={trend.color} stopOpacity={0.3} />
                  <stop
                    offset="95%"
                    stopColor={trend.color}
                    stopOpacity={0.04}
                  />
                </linearGradient>
              </defs>
              {axes}
              <Area
                type="linear"
                dataKey="prior"
                name="Before"
                stroke={PRIOR}
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="linear"
                dataKey="current"
                name="Now"
                stroke={trend.color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          ) : (
            <LineChart
              data={trend.data}
              margin={{top: 5, right: 8, left: 0, bottom: 0}}>
              {axes}
              <Line
                type="linear"
                dataKey="prior"
                name="Before"
                stroke={PRIOR}
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="current"
                name="Now"
                stroke={trend.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
        <HStack gap={5} vAlign="center">
          <LegendDot color={trend.color} label="Now" />
          <LegendDot color={PRIOR} label="The 7 before" />
        </HStack>
      </VStack>
    </Card>
  );
}

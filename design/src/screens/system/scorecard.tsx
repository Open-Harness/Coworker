'use client';

import * as stylex from '@stylexjs/stylex';
import {VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Card} from '@astryxdesign/core/Card';
import {Icon} from '@astryxdesign/core/Icon';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import {deltaText, type Kpi, type Unit} from './totals';

export type Rag = 'green' | 'amber' | 'red';

export const RAG_ICON: Record<Rag, 'success' | 'warning' | 'error'> = {
  green: 'success',
  amber: 'warning',
  red: 'error',
};

// A delta becomes RAG by magnitude + whether the direction is favorable.
export function ragFor(deltaPct: number, higherIsBetter: boolean): Rag {
  const favorable = higherIsBetter ? deltaPct >= 0 : deltaPct <= 0;
  const mag = Math.abs(deltaPct);
  if (favorable) {
    return mag >= 1 ? 'green' : 'amber';
  }
  return mag >= 3 ? 'red' : 'amber';
}

// The scorecard is one flat grid of 6 tiles: 1 column (small), 2 (medium),
// 3 (large) — i.e. 1x6, 2x3, 3x2. The tiers are pinned to viewport width
// rather than derived from tile width via auto-fill, so the breakpoints are
// explicit. The ranges are non-overlapping, so exactly one ever matches and
// the result can't depend on StyleX's at-rule ordering or on source order.
const SCORECARD_MEDIUM = '@media (min-width: 768px) and (max-width: 1199.98px)';
const SCORECARD_LARGE = '@media (min-width: 1200px)';

// Overrides Grid's own grid-template-columns. Grid routes its track template
// through a CSS var and applies `xstyle` last, so this wins.
export const scorecardStyles = stylex.create({
  grid: {
    gridTemplateColumns: {
      default: '1fr',
      [SCORECARD_MEDIUM]: 'repeat(2, 1fr)',
      [SCORECARD_LARGE]: 'repeat(3, 1fr)',
    },
  },
});

// Up / down for movement, right for flat.
const DELTA_ICON = {
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  flat: ArrowRightIcon,
};

export function DeltaIndicator({
  delta,
  unit,
  rag,
}: {
  delta: number;
  unit: Unit;
  rag: Rag;
}) {
  const direction = delta === 0 ? 'flat' : delta < 0 ? 'down' : 'up';
  return (
    <HStack gap={2} vAlign="center">
      <Text type="body" color="secondary">
        {deltaText(delta, unit)}
      </Text>
      <Icon icon={DELTA_ICON[direction]} size="xsm" color={RAG_ICON[rag]} />
    </HStack>
  );
}

export function ScorecardTile({kpi}: {kpi: Kpi}) {
  const rag = ragFor(kpi.delta, kpi.higherIsBetter);
  return (
    <Card padding={5}>
      <VStack gap={1}>
        <Text type="label" color="secondary">
          {kpi.label}
        </Text>
        <HStack gap={4} vAlign="center" wrap="wrap">
          <Heading level={2} accessibilityLevel={3}>
            {kpi.value}
          </Heading>
          <DeltaIndicator delta={kpi.delta} unit={kpi.unit} rag={rag} />
        </HStack>
        <Text type="supporting" color="secondary">{kpi.means}</Text>
      </VStack>
    </Card>
  );
}

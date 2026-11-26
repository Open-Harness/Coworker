// astryx-template: dashboard-scorecard
'use client';

import {useState} from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  VStack,
  HStack,
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
} from '@astryxdesign/core/Layout';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {Grid} from '@astryxdesign/core/Grid';
import {Text, Heading} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Icon} from '@astryxdesign/core/Icon';
import {Divider} from '@astryxdesign/core/Divider';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import {ArrowDownTrayIcon as DownloadIcon} from '@heroicons/react/24/outline';
import {go} from '../../shell';
import {MANAGERS} from '../../world';
import {PERIOD_LABEL, PERIOD_SUBTITLE, type Period} from './data';
import {GoalRow} from './goals';
import {NarrativeBlock} from './narrative';
import {ScorecardTile, scorecardStyles} from './scorecard';
import {kpisFor, TRENDS} from './totals';
import {TrendChart} from './trend';

function SectionHeading({title, hint}: {title: string; hint?: string}) {
  return (
    <HStack hAlign="between" vAlign="center" gap={3}>
      <Heading level={2}>{title}</Heading>
      {hint ? (
        <Text type="supporting" color="secondary">
          {hint}
        </Text>
      ) : null}
    </HStack>
  );
}

const pageStyles = stylex.create({
  // Deepen the scroll container's bottom gutter past the padding={6} default so
  // the last section doesn't butt against the edge. The matching container var
  // is updated too, since bleed children (Divider, Section) read it to pull
  // themselves back out to the content edge.
  contentBottomPad: {
    paddingBlockEnd: 'var(--spacing-10)',
    '--container-padding-block-end': 'var(--spacing-10)',
  },
});

/** Furthest from its goal first. */
const BY_GOAL = [...MANAGERS].sort((a, b) => a.goal.pct / (a.goal.line ?? 100) - b.goal.pct / (b.goal.line ?? 100));

export default function SystemScreen() {
  const [period, setPeriod] = useState<Period>('7');
  // The narrative rail needs ~400px of its own, and the sidebar already takes
  // some of the pane; below this the content column would be too cramped for
  // the tiles, so the rail folds inline.
  const isNarrow = useMediaQuery('(max-width: 1439px)');

  return (
    <Layout
      height="fill"
      contentWidth={1440}
      header={
        <LayoutHeader padding={4} hasDivider>
          <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={0}>
              <Heading level={1}>Overview</Heading>
              {/* On a narrow screen the update time moves to its own line,
                  whole, instead of squeezing into a sliver beside the period. */}
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text type="supporting" color="secondary">
                  {PERIOD_SUBTITLE[period]}
                </Text>
                <Text type="supporting" color="secondary">
                  · Updated 09:54
                </Text>
              </HStack>
            </VStack>
            <HStack gap={3} wrap="wrap">
              <SegmentedControl
                label="Period"
                value={period}
                onChange={value => setPeriod(value as Period)}>
                {(Object.keys(PERIOD_LABEL) as Period[]).map(p => (
                  <SegmentedControlItem
                    key={p}
                    label={PERIOD_LABEL[p]}
                    value={p}
                  />
                ))}
              </SegmentedControl>
              <Button
                label="Export"
                variant="secondary"
                icon={<Icon icon={DownloadIcon} size="sm" />}
                onClick={() => go('soon-Export')}
              />
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent
          role="main"
          padding={4}
          xstyle={pageStyles.contentBottomPad}>
          <VStack gap={10}>
            {/* Narrative lives in the end rail; it folds in here when narrow. */}
            {isNarrow && (
              <VStack gap={6}>
                <SectionHeading title="What changed & why" hint="By Juno" />
                <NarrativeBlock />
              </VStack>
            )}

            {/* Objectives */}
            <VStack gap={6}>
              <SectionHeading
                title="What we are trying to get to"
                hint="Furthest from its line first"
              />
              <VStack gap={6}>
                {BY_GOAL.map((m, i) => (
                  <VStack gap={6} key={m.id}>
                    {i > 0 && <Divider />}
                    <GoalRow m={m} />
                  </VStack>
                ))}
              </VStack>
            </VStack>

            {/* Scorecard row */}
            <VStack gap={6}>
              <SectionHeading
                title="What it takes, and what it costs"
                hint={`All ${MANAGERS.length - 1} managers`}
              />
              <Grid gap={2} xstyle={scorecardStyles.grid}>
                {kpisFor(period).map(kpi => (
                  <ScorecardTile key={kpi.key} kpi={kpi} />
                ))}
              </Grid>
            </VStack>

            {/* Trend section: 2x2 grid */}
            <VStack gap={6}>
              <SectionHeading
                title="Trends"
                hint="Day by day, last 7 days against the 7 before"
              />
              {/* `max` at the chart count changes no layout where a chart
                  fits its 330px floor, and lets a lone chart shrink to a
                  narrower phone column instead of overflowing it. */}
              <Grid
                columns={{minWidth: 330, repeat: 'fit', max: TRENDS.length}}
                gap={3}>
                {TRENDS.map(trend => (
                  <TrendChart key={trend.key} trend={trend} />
                ))}
              </Grid>
            </VStack>
          </VStack>
        </LayoutContent>
      }
      end={
        isNarrow ? undefined : (
          <LayoutPanel
            width={400}
            padding={4}
            hasDivider
            role="complementary"
            label="What changed and why">
            <VStack gap={6}>
              <SectionHeading title="What changed & why" hint="By Juno" />
              <NarrativeBlock />
            </VStack>
          </LayoutPanel>
        )
      }
    />
  );
}

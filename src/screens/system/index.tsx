// astryx-template: dashboard-scorecard
import { useRef, useState, type CSSProperties } from "react";
import { VStack, HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel } from "@astryxdesign/core/Layout";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Grid } from "@astryxdesign/core/Grid";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Divider } from "@astryxdesign/core/Divider";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { OverviewView } from "~/modules/views-workspace/types.ts";
import { byDistance, GoalRow } from "./goals.tsx";
import { NarrativeBlock } from "./narrative.tsx";
import { ScorecardTile } from "./scorecard.tsx";
import { Trends } from "./trends.tsx";

type Period = OverviewView["period"];
const PERIODS = ["7", "30", "90"] as const satisfies readonly Period[];
const BOTTOM = { paddingBlockEnd: "var(--spacing-10)", "--container-padding-block-end": "var(--spacing-10)" } as CSSProperties;

function SectionHeading({ title, hint }: { readonly title: string; readonly hint?: string }) {
  return (
    <HStack hAlign="between" vAlign="center" gap={3}>
      <Heading level={2}>{title}</Heading>
      {hint === undefined ? null : (
        <Text type="supporting" color="secondary">
          {hint}
        </Text>
      )}
    </HStack>
  );
}

interface OverviewProps {
  readonly view: OverviewView;
  readonly onPeriod: (period: Period) => void;
}

/** All managers together: where each objective stands, what it takes and costs, and the trends. */
function Overview({ view, onPeriod }: OverviewProps) {
  // The narrative rail needs about 400px of its own; below this it folds in above the rest.
  const isNarrow = useMediaQuery("(max-width: 1439px)");
  const clock = useClock();
  const [isWide, isMedium] = [useMediaQuery("(min-width: 1200px)"), useMediaQuery("(min-width: 768px)")];
  const columns = isWide ? 3 : isMedium ? 2 : 1;
  const narrative = (
    <VStack gap={6}>
      <SectionHeading title="What changed & why" hint="By Juno" />
      <NarrativeBlock changed={view.changed} />
    </VStack>
  );
  return (
    <Layout
      height="fill"
      contentWidth={1440}
      header={
        <LayoutHeader padding={4} hasDivider>
          <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
            <VStack gap={0}>
              <Heading level={1}>Overview</Heading>
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Text type="supporting" color="secondary">{`Last ${view.period} days, against the ${view.period} before`}</Text>
                <Text type="supporting" color="secondary">{`· Updated ${clock.time(view.updated)}`}</Text>
              </HStack>
            </VStack>
            <SegmentedControl
              label="Period"
              value={view.period}
              onChange={(value) => onPeriod(PERIODS.find((one) => one === value) ?? "7")}
            >
              {PERIODS.map((one) => (
                <SegmentedControlItem key={one} label={`${one} days`} value={one} />
              ))}
            </SegmentedControl>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={4} style={BOTTOM}>
          <VStack gap={10}>
            {isNarrow && narrative}
            <VStack gap={6}>
              <SectionHeading title="What we are trying to get to" hint="Furthest from its line first" />
              <VStack gap={6}>
                {byDistance(view.objectives).map((goal, index) => (
                  <VStack gap={6} key={goal.manager}>
                    {index > 0 && <Divider />}
                    <GoalRow goal={goal} />
                  </VStack>
                ))}
              </VStack>
            </VStack>
            <VStack gap={6}>
              <SectionHeading title="What it takes, and what it costs" hint={`All ${view.objectives.length - 1} managers`} />
              <Grid gap={2} columns={columns}>
                {view.tiles.map((tile) => (
                  <ScorecardTile key={tile.id} tile={tile} />
                ))}
              </Grid>
            </VStack>
            <VStack gap={6}>
              <SectionHeading title="Trends" hint="Day by day, last 7 days against the 7 before" />
              <Trends view={view} />
            </VStack>
          </VStack>
        </LayoutContent>
      }
      end={
        isNarrow ? undefined : (
          <LayoutPanel width={400} padding={4} hasDivider role="complementary" label="What changed and why">
            {narrative}
          </LayoutPanel>
        )
      }
    />
  );
}

export default function SystemPage() {
  const [period, setPeriod] = useState<Period>("7");
  const read = useRead("/overview?period", { period });
  // Changing the period keeps what is shown until the new one comes, so the page does not flash.
  const last = useRef<OverviewView | null>(null);
  if (read._tag === "Ok") last.current = read.value;
  if (read._tag === "Loading" && last.current !== null) return <Overview view={last.current} onPeriod={setPeriod} />;
  return (
    <Reading from="/overview?period" parts={{ period }} failed="We could not read the overview">
      {(view) => <Overview view={view} onPeriod={setPeriod} />}
    </Reading>
  );
}

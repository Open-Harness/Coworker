// astryx-template: dashboard-alert-rail
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Reading, useGo, useRead, useRefresh } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import { ManagerFrame } from "../manager-frame/frame.tsx";
import { capital, dayMonth, useZone } from "../manager-frame/words.ts";
import { MetricChart } from "./chart.tsx";
import { Six } from "./six.tsx";
import { MeasureTile } from "./spark.tsx";
import { NeedsSomeone, WhereLost } from "./rail.tsx";
import { What } from "./what.tsx";

const BLUE = "var(--color-data-categorical-blue)";
const COLORS = [BLUE, "var(--color-data-categorical-teal)", "var(--color-data-categorical-orange)"] as const;
const PAGE = { height: "100%" } as const;

/** Is the objective on its line, what brings it, where is it lost, does anything need me. */
function Objective({
  view,
  standing,
}: {
  readonly view: ManagerOverview;
  readonly standing: Extract<ManagerOverview["standing"], { _tag: "Read" }>;
}) {
  const [go, zone] = [useGo(), useZone()];
  const [span, setSpan] = useState("12");
  const isNarrow = useMediaQuery("(max-width: 1024px)");
  const n = Number(span);
  const labels = standing.points.map((one) => dayMonth(one.at, zone)).slice(-n);
  const behind = standing.is === "below its line";
  const needs = (sticky: boolean) => <NeedsSomeone rows={view.rail} hasStickyHeader={sticky} />;
  return (
    <Layout
      height="fill"
      style={PAGE}
      header={
        <LayoutHeader padding={4} hasDivider>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={2}>{view.says}</Heading>
                <HStack gap={2} vAlign="center">
                  <StatusDot variant={behind ? "warning" : "success"} label={capital(standing.is)} />
                  <Text
                    type="supporting"
                    color="secondary"
                  >{`${capital(standing.is)}. “${view.said}” ${view.by.person}, ${dayMonth(view.by.at, zone)}`}</Text>
                </HStack>
              </VStack>
            </StackItem>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <SegmentedControl label="How long" value={span} onChange={setSpan}>
                <SegmentedControlItem label="4 weeks" value="4" />
                <SegmentedControlItem label="12 weeks" value="12" />
              </SegmentedControl>
              <Button label="Change it with Juno" variant="secondary" onClick={() => go("/")} />
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={10}>
            <VStack gap={6}>
              <Grid columns={{ minWidth: 160, max: 4, repeat: "fit" }} gap={3}>
                {view.measures.slice(0, 4).map((one) => (
                  <MeasureTile key={one.tile.id} measure={one} zone={zone} />
                ))}
              </Grid>
              <Grid columns={{ minWidth: 320, max: 2, repeat: "fit" }} gap={3}>
                <MetricChart
                  title={`${view.unit}, each week`}
                  subtitle={view.measures[0]?.read ?? ""}
                  labels={labels}
                  lines={[
                    { name: view.unit, color: BLUE, values: standing.points.map((one) => one.value).slice(-n) },
                    {
                      name: "Its line",
                      color: "var(--color-text-secondary)",
                      isDashed: true,
                      values: standing.points.map((one) => (one.at < standing.since ? null : one.line)).slice(-n),
                    },
                  ]}
                />
                <MetricChart
                  title="What brought them"
                  subtitle="The kind of work each began as"
                  labels={labels}
                  lines={view.brought.map((one, i) => ({
                    name: one.kind,
                    color: COLORS[i % COLORS.length] ?? BLUE,
                    values: one.points.slice(-n),
                  }))}
                />
              </Grid>
            </VStack>
            <Divider />
            <What measures={view.measures} zone={zone} />
            {isNarrow && (
              <VStack gap={4}>
                <Card padding={0}>{needs(false)}</Card>
                <Card padding={0}>
                  <WhereLost view={view} />
                </Card>
              </VStack>
            )}
          </VStack>
        </LayoutContent>
      }
      end={
        isNarrow ? undefined : (
          <LayoutPanel width={400} padding={0} hasDivider role="complementary" label="Who it needs, and where it is lost" isScrollable>
            <VStack gap={0}>
              {needs(true)}
              <Divider />
              <WhereLost view={view} hasStickyHeader />
            </VStack>
          </LayoutPanel>
        )
      }
    />
  );
}

export default function OverviewPage({ params }: PageProps) {
  const id = params["manager"] ?? "";
  const read = useRead("/m/:manager", params);
  const refresh = useRefresh();
  return (
    <ManagerFrame id={id} tab="Overview">
      {read._tag === "Failed" ? (
        <Six failed={{ what: "We could not read the last 7 days", says: read.says, onRetry: () => refresh() }} />
      ) : (
        <Reading from="/m/:manager" parts={params} gone={{ title: "This manager is not here" }}>
          {(view) => (view.standing._tag === "Read" ? <Objective view={view} standing={view.standing} /> : <Six view={view} />)}
        </Reading>
      )}
    </ManagerFrame>
  );
}

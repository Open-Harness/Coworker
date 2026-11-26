// astryx-template: dashboard-alert-rail
import { useState, type CSSProperties } from "react";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { go } from "../../shell";
import { WORK } from "../../world";
import { MeasureTile, MetricChart, type ChartLine } from "./charts";
import { OBJECTIVES } from "./measures";
import { NeedsBo, WhereLost } from "./lost";
import { NeedsSomeone } from "./rail";
import { What } from "./what";

const COLOR = ["var(--color-data-categorical-blue)", "var(--color-data-categorical-teal)", "var(--color-data-categorical-orange)"] as const;
const pageStyle: CSSProperties = { height: "100%" };

/** Is the objective on its line, what brings it, where is it lost, does anything need me. */
export default function OverviewScreen() {
  const id = location.hash.startsWith("#m-sales") ? "sales" : "coding";
  const o = OBJECTIVES[id]!;
  const [span, setSpan] = useState("12");
  const isNarrow = useMediaQuery("(max-width: 1024px)");
  const n = Number(span);
  const labels = o.weeks.slice(-n);
  const series = { labels, ticks: labels.map((_, i) => i).filter((i) => n <= 4 || i % 2 === 1) };
  const result: ChartLine[] = [
    { key: "result", name: o.unit, color: COLOR[0], values: o.result.slice(-n) },
    { key: "line", name: "Its line", color: "var(--color-text-secondary)", values: o.line.slice(-n), isDashed: true },
  ];
  const brought: ChartLine[] = o.brought.map((b, i) => ({ key: b.name, name: b.name, color: COLOR[i]!, values: b.values.slice(-n) }));
  const needs = id === "sales" ? (sticky: boolean) => <NeedsBo hasStickyHeader={sticky} /> : (sticky: boolean) => <NeedsSomeone rows={WORK} hasStickyHeader={sticky} />;
  return (
    <Layout height="fill" style={pageStyle}
      header={
        <LayoutHeader padding={4} hasDivider>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={1}>
                <Heading level={2}>{o.text}</Heading>
                <HStack gap={2} vAlign="center">
                  <StatusDot variant={o.isBehind ? "warning" : "success"} label={o.state} />
                  <Text type="supporting" color="secondary">{`${o.state}. “${o.said}” ${o.who}`}</Text>
                </HStack>
              </VStack>
            </StackItem>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <SegmentedControl label="How long" value={span} onChange={setSpan}>
                <SegmentedControlItem label="4 weeks" value="4" /><SegmentedControlItem label="12 weeks" value="12" />
              </SegmentedControl>
              <Button label="Change it with Juno" variant="secondary" onClick={() => go(id === "sales" ? "setup" : "soon-Chat")} />
            </HStack>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={10}>
            <VStack gap={6}>
              <Grid columns={{ minWidth: 160, max: 4, repeat: "fit" }} gap={3}>{o.measures.slice(0, 4).map((m) => <MeasureTile key={m.id} m={m} />)}</Grid>
              <Grid columns={{ minWidth: 320, max: 2, repeat: "fit" }} gap={3}>
                <MetricChart title={`${o.unit}, each week`} subtitle={o.note} series={series} lines={result} unit="" />
                <MetricChart title="What brought them" subtitle="The kind of work each began as" series={series} lines={brought} unit="" />
              </Grid>
            </VStack>
            <Divider />
            <What measures={o.measures} />
            {isNarrow && <VStack gap={4}><Card padding={0}>{needs(false)}</Card><Card padding={0}><WhereLost rows={o.lost} /></Card></VStack>}
          </VStack>
        </LayoutContent>
      }
      end={isNarrow ? undefined : (
        <LayoutPanel width={400} padding={0} hasDivider role="complementary" label="Who it needs, and where it is lost" isScrollable>
          <VStack gap={0}>{needs(true)}<Divider /><WhereLost rows={o.lost} hasStickyHeader /></VStack>
        </LayoutPanel>
      )}
    />
  );
}

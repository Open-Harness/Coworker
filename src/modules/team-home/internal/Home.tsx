import { type ReactNode, useCallback, useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Load, useLoading } from "~/modules/team-core/service.ts";
import { BarChart, LineChart } from "~/modules/ui/service.ts";
import type { HomeData, Range } from "../types.ts";
import { HomeRail } from "./HomeRail.tsx";
import { Tile, plural } from "./Tile.tsx";
import { useHomeApi } from "./use-api.ts";
import { isRange, shortDay, total, RANGES, within } from "./range.ts";

/** How often an open Home asks again. */
const REFRESH_MS = 10_000;

/** Astryx's `dashboard-alert-rail` folds its rail into the content below this width. */
const NARROW = "(max-width: 1024px)";

function Chart({ title, note, children }: { readonly title: string; readonly note: string; readonly children: ReactNode }) {
  return (
    <Card padding={5}>
      <VStack gap={3}>
        <VStack gap={0.5}>
          <Heading level={3}>{title}</Heading>
          <Text type="supporting" color="secondary">
            {note}
          </Text>
        </VStack>
        {children}
      </VStack>
    </Card>
  );
}

function Tiles({ data }: { readonly data: HomeData }) {
  const { tiles } = data;
  return (
    <Grid columns={{ minWidth: 160, max: 4, repeat: "fit" }} gap={3}>
      <Tile label="Open tasks" value={tiles.openTasks} note={`${plural(data.managers.length, "manager")}`} />
      <Tile label="Agents running" value={tiles.runningAgents} note="Working right now" />
      <Tile label="Waiting on people" value={tiles.waitingOnPeople} note="Tasks that need an answer or a review" />
      <Tile label="Needs you" value={tiles.needsYou} note="Open in your Inbox" />
    </Grid>
  );
}

function Charts({ data, range }: { readonly data: HomeData; readonly range: Range }) {
  const days = within(range, data.days).map(shortDay);
  const span = range === "7d" ? "the last 7 days" : "the last 30 days";
  const { events } = data;
  return (
    <Grid columns={{ minWidth: 320, max: 2, repeat: "fit" }} gap={3}>
      <Chart title="Tasks created and finished" note={`Per day, ${span}. Finished means it reached the last lane.`}>
        <LineChart
          label={`Tasks created and finished per day, ${span}`}
          labels={days}
          series={[
            { name: "Created", values: within(range, data.created), color: "blue" },
            { name: "Finished", values: within(range, data.finished), color: "green" },
          ]}
          emptyText="No tasks yet"
        />
      </Chart>
      <Chart title="What became of what arrived" note={`Mail and GitHub events per day, ${span}.`}>
        <BarChart
          label={`Events per day by what became of them, ${span}`}
          labels={days}
          isStacked
          series={[
            { name: "Accepted", values: within(range, events.accepted), color: "green" },
            { name: "Follow-ups", values: within(range, events.followup), color: "blue" },
            { name: "Waiting", values: within(range, events.waiting), color: "orange" },
            { name: "Ignored", values: within(range, events.ignored), color: "purple" },
          ]}
          emptyText="Nothing has arrived"
        />
      </Chart>
    </Grid>
  );
}

function Content({
  workspaceId,
  data,
  range,
  isNarrow,
}: {
  readonly workspaceId: string;
  readonly data: HomeData;
  readonly range: Range;
  readonly isNarrow: boolean;
}) {
  const arrived = total(data.events.accepted) + total(data.events.followup) + total(data.events.ignored) + total(data.events.waiting);
  return (
    <VStack gap={6}>
      {data.canSeeTasks ? (
        <>
          <Tiles data={data} />
          <Charts data={data} range={range} />
        </>
      ) : (
        <EmptyState title="Tasks are not open to your role" description="What needs you is in the panel and in your Inbox." isCompact />
      )}
      {data.canSeeTasks && data.managers.length === 0 && arrived === 0 && (
        <EmptyState
          title="No managers yet"
          description="Make one from a template with New manager in the sidebar. What it does shows up here."
          headingLevel={2}
        />
      )}
      {isNarrow && (
        <Card padding={0}>
          <HomeRail workspaceId={workspaceId} data={data} />
        </Card>
      )}
    </VStack>
  );
}

/** Astryx's `dashboard-alert-rail`: tiles and charts, and a rail that scrolls on its own with what needs you and the managers. */
export function Home({ workspaceId }: { readonly workspaceId: string }) {
  const api = useHomeApi();
  const [range, setWindow] = useState<Range>("7d");
  const isNarrow = useMediaQuery(NARROW);
  const home = useLoading(
    useCallback(() => api.home(workspaceId), [api, workspaceId]),
    REFRESH_MS,
  );
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader padding={6} hasDivider>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={0.5}>
                <Heading level={1}>Home</Heading>
                <Text type="supporting" color="secondary">
                  What needs you, and how the work is going. Days are UTC.
                </Text>
              </VStack>
            </StackItem>
            <SegmentedControl label="Time window" value={range} size="sm" onChange={(value) => isRange(value) && setWindow(value)}>
              {RANGES.map(({ value, label }) => (
                <SegmentedControlItem key={value} value={value} label={label} />
              ))}
            </SegmentedControl>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={6}>
          <Load loaded={home.loaded} failedTitle="Home did not load" onRetry={home.reload}>
            {(data) => <Content workspaceId={workspaceId} data={data} range={range} isNarrow={isNarrow} />}
          </Load>
        </LayoutContent>
      }
      {...(isNarrow
        ? {}
        : {
            end: (
              <LayoutPanel width={380} padding={0} hasDivider role="complementary" label="Needs you and managers" isScrollable>
                <Load loaded={home.loaded} failedTitle="The rail did not load" onRetry={home.reload}>
                  {(data) => <HomeRail workspaceId={workspaceId} data={data} />}
                </Load>
              </LayoutPanel>
            ),
          })}
    />
  );
}

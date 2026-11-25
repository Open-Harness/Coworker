import { type ReactNode, useCallback, useState } from "react";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Section } from "@astryxdesign/core/Section";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Load, teamLinks, useLoading } from "~/modules/team-core/service.ts";
import type { ChartColor } from "~/modules/ui/types.ts";
import { DonutChart, LineChart } from "~/modules/ui/service.ts";
import type { OverviewData, Range } from "../types.ts";
import { AgentsTable } from "./AgentsTable.tsx";
import { Blocked } from "./Blocked.tsx";
import { plural } from "./Tile.tsx";
import { useHomeApi } from "./use-api.ts";
import { isRange, RANGES, shortDay, within } from "./range.ts";

const REFRESH_MS = 10_000;

/** Lanes take these in order; the last lane, where work is done, is always green. */
const LANE_COLORS: readonly ChartColor[] = ["blue", "orange", "purple", "teal", "pink", "cyan", "red"];

function Panel({ title, note, children }: { readonly title: string; readonly note: string; readonly children: ReactNode }) {
  return (
    <VStack gap={3}>
      <VStack gap={0.5}>
        <Heading level={3}>{title}</Heading>
        <Text type="supporting" color="secondary">
          {note}
        </Text>
      </VStack>
      {children}
    </VStack>
  );
}

function Body({ workspaceId, data, range }: { readonly workspaceId: string; readonly data: OverviewData; readonly range: Range }) {
  const days = within(range, data.days).map(shortDay);
  const span = range === "7d" ? "the last 7 days" : "the last 30 days";
  const { totals } = data;
  return (
    <>
      <Section padding={6}>
        <Grid gap={10} columns={{ minWidth: 320, max: 3 }}>
          <Panel title="Tasks by lane" note={`${plural(totals.tasks, "task")}, ${totals.done} in the last lane`}>
            <DonutChart
              label="Tasks by lane"
              centre={totals.tasks === 0 ? "0" : `${Math.round((totals.done / totals.tasks) * 100)}%`}
              slices={data.lanes.map((lane, index) => ({
                name: lane.name,
                value: lane.count,
                color: lane.isDone ? "green" : (LANE_COLORS[index % LANE_COLORS.length] ?? "blue"),
              }))}
              emptyText="No tasks yet"
            />
          </Panel>
          <Panel title="Burndown" note={`Tasks still open at the end of each day, ${span}`}>
            <LineChart
              label={`Open tasks at the end of each day, ${span}`}
              labels={days}
              series={[{ name: "Open", values: within(range, data.open), color: "orange" }]}
              emptyText="Nothing open"
            />
          </Panel>
          <Blocked workspaceId={workspaceId} data={data} />
        </Grid>
      </Section>
      <Section padding={6}>
        <Panel title="Created and finished" note={`Tasks per day, ${span}`}>
          <Card padding={5}>
            <LineChart
              label={`Tasks created and finished per day, ${span}`}
              labels={days}
              series={[
                { name: "Created", values: within(range, data.created), color: "blue" },
                { name: "Finished", values: within(range, data.finished), color: "green" },
              ]}
              emptyText="No tasks yet"
            />
          </Card>
        </Panel>
      </Section>
      <Section padding={6}>
        <AgentsTable agents={data.agents} />
      </Section>
    </>
  );
}

/** Astryx's `dashboard-progress`, without its dated timeline: tasks have no due dates. */
export function Overview({ workspaceId, managerId }: { readonly workspaceId: string; readonly managerId: string }) {
  const api = useHomeApi();
  const [range, setRange] = useState<Range>("7d");
  const overview = useLoading(
    useCallback(() => api.overview(workspaceId, managerId), [api, workspaceId, managerId]),
    REFRESH_MS,
  );
  const data = overview.loaded?._tag === "Loaded" ? overview.loaded.value : undefined;
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader padding={6} hasDivider>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={1}>
                <Breadcrumbs variant="supporting">
                  <BreadcrumbItem href={teamLinks.workspace(workspaceId)}>Home</BreadcrumbItem>
                  <BreadcrumbItem isCurrent>Overview</BreadcrumbItem>
                </Breadcrumbs>
                <Heading level={1}>{data?.name ?? "Overview"}</Heading>
                {data !== undefined && data.mission !== "" && <Text color="secondary">{data.mission}</Text>}
              </VStack>
            </StackItem>
            <Button label="Open the board" variant="secondary" size="sm" href={teamLinks.board(workspaceId, managerId)} />
            <SegmentedControl label="Time window" value={range} size="sm" onChange={(value) => isRange(value) && setRange(value)}>
              {RANGES.map(({ value, label }) => (
                <SegmentedControlItem key={value} value={value} label={label} />
              ))}
            </SegmentedControl>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0}>
          <Load loaded={overview.loaded} failedTitle="The overview did not load" onRetry={overview.reload}>
            {(loaded) =>
              loaded.totals.tasks === 0 && loaded.agents.length === 0 ? (
                <EmptyState
                  title="Nothing to show yet"
                  description="Ask the manager for something in its Chat, and its tasks, agents and progress appear here."
                  actions={<Button label="Open the chat" href={teamLinks.chat(workspaceId, managerId)} />}
                />
              ) : (
                <Body workspaceId={workspaceId} data={loaded} range={range} />
              )
            }
          </Load>
        </LayoutContent>
      }
    />
  );
}

// astryx-template: dashboard-scorecard
import { useMemo } from "react";
import { VStack, HStack } from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Icon } from "@astryxdesign/core/Icon";
import { StopIcon } from "@heroicons/react/24/outline";
import { useRead } from "~/modules/page/service.ts";
import { TrendChart as Drawn } from "~/modules/ui/service.ts";
import type { ChartColor } from "~/modules/ui/types.ts";
import type { Day, OverviewView } from "~/modules/views-workspace/types.ts";
import { changeOf, valueOf } from "./figures.ts";

interface Trend {
  readonly id: string;
  readonly title: string;
  readonly color: ChartColor;
  readonly pick: (day: Day) => number;
  /** Short, for the axis. */
  readonly format: (value: number) => string;
  readonly isFilled?: true;
}

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

const TRENDS: readonly Trend[] = [
  { id: "people", title: "Your team’s time", color: "blue", pick: (day) => day.people, format: (v) => `${v} m`, isFilled: true },
  { id: "wait", title: "A customer’s wait", color: "green", pick: (day) => day.wait, format: (v) => `${v} h` },
  {
    id: "sent",
    title: "Sent back by people",
    color: "purple",
    pick: (day) => Math.round(day.sentBack * 1000) / 10,
    format: (v) => `${v}%`,
  },
  { id: "cost", title: "What it cost", color: "orange", pick: (day) => day.cost, format: (v) => `$${compact.format(v)}` },
];

/** The swatch must be the exact stroke of its line, which Icon's semantic colours cannot say. */
function Key({ color, label }: { readonly color: string; readonly label: string }) {
  return (
    <HStack gap={2} vAlign="center">
      <Icon icon={StopIcon} size="xsm" style={{ color }} />
      <Text type="supporting" color="secondary">
        {label}
      </Text>
    </HStack>
  );
}

function TrendCard({ trend, view, labels }: { readonly trend: Trend; readonly view: OverviewView; readonly labels: readonly string[] }) {
  const tile = view.tiles.find((one) => one.id === trend.id);
  const change = tile === undefined ? undefined : changeOf(tile);
  return (
    <Card padding={5}>
      <VStack gap={6}>
        <HStack hAlign="between" vAlign="center" gap={2} wrap="wrap">
          <HStack gap={2}>
            <Heading level={3}>{trend.title}</Heading>
            {tile === undefined ? null : (
              <Heading level={3} color="secondary">
                {valueOf(tile)}
              </Heading>
            )}
          </HStack>
          {change === undefined ? null : (
            <Text type="supporting" color="secondary">
              {change.text} vs before
            </Text>
          )}
        </HStack>
        <Drawn
          labels={labels}
          now={view.daily.map(trend.pick)}
          before={view.dailyBefore.map(trend.pick)}
          color={trend.color}
          format={trend.format}
          {...(trend.isFilled === true ? { isFilled: true } : {})}
        />
        <HStack gap={5} vAlign="center">
          <Key color={`var(--color-data-categorical-${trend.color})`} label="Now" />
          <Key color="var(--color-text-secondary)" label="The 7 before" />
        </HStack>
      </VStack>
    </Card>
  );
}

/** Day by day, the last 7 days against the 7 before. */
export function Trends({ view }: { readonly view: OverviewView }) {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  const labels = useMemo(() => {
    const format = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: zone });
    return view.daily.map((day) => format.format(day.day));
  }, [view.daily, zone]);
  return (
    <Grid columns={{ minWidth: 330, repeat: "fit", max: TRENDS.length }} gap={3}>
      {TRENDS.map((trend) => (
        <TrendCard key={trend.id} trend={trend} view={view} labels={labels} />
      ))}
    </Grid>
  );
}

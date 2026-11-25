import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import type { Loaded } from "~/modules/team-core/types.ts";
import { BarChart, Page, PageSection } from "~/modules/ui/service.ts";
import type { BudgetData, UsageData } from "../types.ts";
import { BudgetRow } from "./BudgetRow.tsx";
import { day, dollars, hours } from "./words.ts";

const DAYS_SHOWN = 14;
const DAY_MS = 86_400_000;

/** The days that had usage, with the quiet days between them as zero, so the bars sit on a true time axis. */
function withGaps(used: UsageData["perDay"]): UsageData["perDay"] {
  const first = used[0];
  const last = used.at(-1);
  if (first === undefined || last === undefined) return [];
  const byDay = new Map(used.map(({ day: name, hours: value }) => [name, value]));
  const days: { day: string; hours: number }[] = [];
  for (let at = Date.parse(first.day); at <= Date.parse(last.day); at += DAY_MS) {
    const name = new Date(at).toISOString().slice(0, 10);
    days.push({ day: name, hours: byDay.get(name) ?? 0 });
  }
  return days;
}

function Figure({ title, figure, note }: { readonly title: string; readonly figure: string; readonly note: string }) {
  return (
    <Card padding={4} height="100%">
      <VStack gap={1}>
        <Text type="supporting">{title}</Text>
        <Heading level={2} accessibilityLevel={3}>
          {figure}
        </Heading>
        <Text type="supporting">{note}</Text>
      </VStack>
    </Card>
  );
}

/** Sandbox time and runs this period, day by day, and the budget each manager has on its own sandbox hours. */
export function UsageScreen({
  usage,
  onBudget,
}: {
  readonly usage: UsageData;
  readonly onBudget: (managerId: string, budget: BudgetData | null) => Promise<Loaded<true>>;
}) {
  const { hours: sandbox, runs, perDay, managers } = usage;
  const recent = withGaps(perDay).slice(-DAYS_SHOWN);
  return (
    <Page
      width="wide"
      title="Usage"
      description={`Since ${day(usage.periodStart)}, until the renewal on ${day(usage.renewsAt)}. Models run on your own keys and are not counted here.`}
    >
      <Grid columns={{ minWidth: 200, repeat: "fit" }} gap={3} align="stretch">
        <Figure
          title="Sandbox hours"
          figure={`${hours(sandbox.used)} of ${hours(sandbox.included)}`}
          note={sandbox.over > 0 ? `${hours(sandbox.over)} past the plan: ${dollars(usage.overageCents)}` : "Within what the seats include"}
        />
        <Figure title="Runs this period" figure={String(runs.thisPeriod)} note={`${runs.lastPeriod} the period before`} />
        <Figure
          title="Managers"
          figure={String(managers.length)}
          note={`${managers.filter(({ budget }) => budget !== null).length} with a budget`}
        />
      </Grid>
      <PageSection title="Sandbox hours by day">
        {recent.length === 0 ? (
          <EmptyState title="No sandbox time used yet" isCompact />
        ) : (
          <Card padding={4}>
            <BarChart
              label="Sandbox hours by day"
              unit="h"
              hasDecimals
              labels={recent.map(({ day: name }) => name.slice(5))}
              series={[{ name: "Sandbox hours", values: recent.map(({ hours: used }) => used), color: "blue" }]}
            />
          </Card>
        )}
      </PageSection>
      <PageSection title="Budgets per manager">
        <Text type="supporting">A budget counts sandbox hours this period. At 80% and again at 100% the manager's owner is told.</Text>
        {managers.length === 0 ? (
          <EmptyState title="No managers yet" description="Make one and its budget is set here." isCompact />
        ) : (
          managers.map((manager) => <BudgetRow key={manager.managerId} manager={manager} onBudget={onBudget} />)
        )}
      </PageSection>
    </Page>
  );
}

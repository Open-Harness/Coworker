// astryx-template: dashboard
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Reading, useGo, useRead } from "~/modules/page/service.ts";
import type { UsageView } from "~/modules/views-workspace/types.ts";
import { BarChart } from "~/modules/ui/service.ts";
import { day, dollars } from "../format.ts";

interface Line extends Record<string, unknown> {
  readonly id: string;
  readonly name: string;
  readonly cost: number;
}
const sum = (rows: readonly { readonly cost: number }[]): number => rows.reduce((total, row) => total + row.cost, 0);

function Tile({ label, value, note }: { readonly label: string; readonly value: string; readonly note: string }) {
  return (
    <Card padding={4}>
      <VStack gap={1}>
        <Text type="supporting" color="secondary">
          {label}
        </Text>
        <Heading level={2}>{value}</Heading>
        <Text type="supporting" color="secondary">
          {note}
        </Text>
      </VStack>
    </Card>
  );
}

/** A table whose rows are a share of the week: the name, a bar, and dollars. The rows add up to the total under it. */
function Split({ title, rows }: { readonly title: string; readonly rows: readonly Line[] }) {
  const total = sum(rows);
  const columns: TableColumn<Line>[] = [
    {
      key: "name",
      header: title,
      width: proportional(1, { minWidth: 120 }),
      renderCell: (r) => (
        <Text type="body" maxLines={1}>
          {r.name}
        </Text>
      ),
    },
    {
      key: "share",
      header: "Share",
      width: proportional(1, { minWidth: 80 }),
      renderCell: (r) => <ProgressBar label={`${r.name} share`} isLabelHidden value={r.cost} max={total} variant="neutral" />,
    },
    {
      key: "cost",
      header: "Dollars",
      width: pixel(80),
      renderCell: (r) => (
        <Text type="body" justify="end">
          {dollars(r.cost)}
        </Text>
      ),
    },
  ];
  return (
    <Card padding={0}>
      <VStack gap={0}>
        <Table<Line> data={[...rows]} columns={columns} idKey="id" density="balanced" dividers="rows" />
        <HStack hAlign="between" padding={3}>
          <Text type="body" weight="semibold">
            All together
          </Text>
          <Text type="body" weight="semibold">
            {dollars(total)}
          </Text>
        </HStack>
      </VStack>
    </Card>
  );
}

function Usage({
  view,
  models,
  zone,
}: {
  readonly view: UsageView;
  readonly models: Readonly<Record<string, string>>;
  readonly zone: string;
}) {
  const go = useGo();
  const most = view.days.reduce((best, one) => (one.cost > best.cost ? one : best), view.days[0] ?? { day: 0, cost: 0, boxes: 0 });
  const over = view.days.filter((one) => one.cost >= view.tellAt).length;
  return (
    <VStack gap={6}>
      <Grid columns={{ minWidth: 150, max: 4 }} gap={4}>
        <Tile label="Spent in 7 days" value={dollars(sum(view.days))} note="Models, searches and machines" />
        <Tile label="Most in one day" value={dollars(most.cost)} note={day(most.day, zone)} />
        <Tile label="Its limit a day" value={dollars(view.perDay)} note="For all managers together" />
        <Tile label="Told you at" value={dollars(view.tellAt)} note={over === 0 ? "No day got there" : `${over} days got there`} />
      </Grid>
      <Card padding={5}>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
            <Heading level={3}>Each day</Heading>
            <Text type="supporting" color="secondary">
              Dashed lines: where it tells you, and the limit
            </Text>
          </HStack>
          <BarChart
            label="Spent each day"
            labels={view.days.map((one) => day(one.day, zone))}
            series={[{ name: "Spent", values: view.days.map((one) => one.cost), color: "blue" }]}
            unit="dollars"
            axis={{
              ticks: [0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(part * view.perDay)),
              top: Math.round(view.perDay * 1.1),
              prefix: "$",
            }}
            lines={[view.tellAt, view.perDay]}
            over={view.tellAt}
          />
        </VStack>
      </Card>
      <Grid columns={{ minWidth: 340, max: 2 }} gap={4}>
        <VStack gap={2}>
          <Heading level={3}>By manager</Heading>
          <Split title="Manager" rows={view.managers.map((one) => ({ id: one.id, name: one.name, cost: one.cost }))} />
        </VStack>
        <VStack gap={2}>
          <Heading level={3}>By model</Heading>
          <Split title="Model" rows={view.models.map((one) => ({ id: one.model, name: models[one.model] ?? one.model, cost: one.cost }))} />
        </VStack>
      </Grid>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <Text type="supporting" color="secondary">
          The limit and when it tells you are set in General.
        </Text>
        <Button label="How Juno hands it out" size="sm" variant="ghost" onClick={() => go("/juno/spending")} />
      </HStack>
    </VStack>
  );
}

/** What the workspace spent in the last week, by day, by manager and by model. */
export default function UsagePage() {
  const [shell, keys] = [useRead("/shell"), useRead("/settings/keys")];
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  const models = keys._tag === "Ok" ? Object.fromEntries(keys.value.models.flatMap((one) => one.models.map((m) => [m.model, m.name]))) : {};
  return <Reading from="/settings/usage">{(view) => <Usage view={view} models={models} zone={zone} />}</Reading>;
}

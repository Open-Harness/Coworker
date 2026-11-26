// astryx-template: dashboard
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { go } from "../../../shell";
import { BY_MANAGER, BY_MODEL, DAY_COST, LIMIT, MOST, sum, TELL_AT, WEEK } from "../facts/money";

const AXIS = { fontSize: "var(--font-size-sm)", fill: "var(--color-text-secondary)" };
interface Line extends Record<string, unknown> { id: string; name: string; cost: number }

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return <Card padding={4}><VStack gap={1}><Text type="supporting" color="secondary">{label}</Text><Heading level={2}>{value}</Heading><Text type="supporting" color="secondary">{note}</Text></VStack></Card>;
}

/** A table whose rows are a share of the week: the name, a bar, and dollars. The rows add up to the total under it. */
function Split({ title, rows }: { title: string; rows: readonly Line[] }) {
  const total = sum(rows);
  const columns: TableColumn<Line>[] = [
    { key: "name", header: title, width: proportional(1, { minWidth: 120 }), renderCell: (r) => <Text type="body" maxLines={1}>{r.name}</Text> },
    { key: "share", header: "Share", width: proportional(1, { minWidth: 80 }), renderCell: (r) => <ProgressBar label={`${r.name} share`} isLabelHidden value={r.cost} max={total} variant="neutral" /> },
    { key: "cost", header: "Dollars", width: pixel(80), renderCell: (r) => <Text type="body" align="end">{`$${r.cost}`}</Text> },
  ];
  return (
    <Card padding={0}>
      <VStack gap={0}>
        <Table<Line> data={[...rows]} columns={columns} idKey="id" density="balanced" dividers="rows" />
        <HStack hAlign="between" padding={3}><Text type="body" weight="semibold">All together</Text><Text type="body" weight="semibold">{`$${total}`}</Text></HStack>
      </VStack>
    </Card>
  );
}

export default function Usage() {
  const over = DAY_COST.filter((d) => d.cost >= TELL_AT).length;
  return (
    <VStack gap={6}>
      <Grid columns={{ minWidth: 150, max: 4 }} gap={4}>
        <Tile label="Spent in 7 days" value={`$${WEEK}`} note="Models, searches and machines" />
        <Tile label="Most in one day" value={`$${MOST.cost}`} note={MOST.day} />
        <Tile label="Its limit a day" value={`$${LIMIT}`} note="For all managers together" />
        <Tile label="Told you at" value={`$${TELL_AT}`} note={over === 0 ? "No day got there" : `${over} days got there`} />
      </Grid>
      <Card padding={5}>
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={2}>
            <Heading level={3}>Each day</Heading>
            <Text type="supporting" color="secondary">Dashed lines: where it tells you, and the limit</Text>
          </HStack>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[...DAY_COST]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} domain={[0, 110]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v: number) => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${v}`, "Spent"]} cursor={{ fill: "var(--color-surface-secondary)" }} />
              <ReferenceLine y={TELL_AT} stroke="var(--color-text-secondary)" strokeDasharray="4 4" />
              <ReferenceLine y={LIMIT} stroke="var(--color-text-secondary)" strokeDasharray="4 4" />
              <Bar dataKey="cost" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {DAY_COST.map((d) => <Cell key={d.day} fill={d.cost >= TELL_AT ? "var(--color-data-categorical-red)" : "var(--color-data-neutral)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </VStack>
      </Card>
      <Grid columns={{ minWidth: 340, max: 2 }} gap={4}>
        <VStack gap={2}><Heading level={3}>By manager</Heading><Split title="Manager" rows={BY_MANAGER} /></VStack>
        <VStack gap={2}><Heading level={3}>By model</Heading><Split title="Model" rows={BY_MODEL} /></VStack>
      </Grid>
      <HStack gap={3} vAlign="center" wrap="wrap"><Text type="supporting" color="secondary">The limit and when it tells you are set in General.</Text><Button label="How Juno hands it out" size="sm" variant="ghost" onClick={() => go("juno-spending")} /></HStack>
    </VStack>
  );
}

// astryx-template: dashboard-alert-rail
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { StatusDot, type StatusDotVariant } from "@astryxdesign/core/StatusDot";
import { Table, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { aimOf, beforeOf, readOf, valueOf, type Measure } from "./measure.ts";

const DOT: Readonly<Record<Measure["is"], readonly [StatusDotVariant, string]>> = {
  good: ["success", "Good"],
  behind: ["warning", "Behind"],
  "not yet": ["neutral", "Not yet"],
};
interface Row extends Record<string, unknown> {
  readonly id: string;
  readonly m: Measure;
}
const small = (text: string) => (
  <Text type="supporting" color="secondary">
    {text}
  </Text>
);

/** Each number in words: what it counts, where it is read, what it was before, what it should be. */
export function What({ measures, zone }: { readonly measures: readonly Measure[]; readonly zone: string }) {
  const isNarrow = useMediaQuery("(max-width: 700px)");
  const name: TableColumn<Row> = {
    key: "name",
    header: "Measure",
    width: proportional(3, { minWidth: 150 }),
    renderCell: ({ m }) => (
      <HStack gap={2} vAlign="start">
        <StatusDot variant={DOT[m.is][0]} label={DOT[m.is][1]} />
        <VStack gap={0}>
          <Text weight="semibold">{m.tile.label}</Text>
          {small(m.role === "guard" ? "Must not get worse" : "Result")}
        </VStack>
      </HStack>
    ),
  };
  const counts: TableColumn<Row> = {
    key: "counts",
    header: "What it counts",
    width: proportional(5, { minWidth: 200 }),
    renderCell: ({ m }) => (
      <VStack gap={0}>
        <Text>{m.counts}</Text>
        {small(readOf(m))}
      </VStack>
    ),
  };
  const before: TableColumn<Row> = {
    key: "before",
    header: "Before",
    width: proportional(2, { minWidth: 88 }),
    renderCell: ({ m }) => <Text color="secondary">{beforeOf(m)}</Text>,
  };
  const now: TableColumn<Row> = {
    key: "now",
    header: "Now",
    width: proportional(2, { minWidth: 76 }),
    renderCell: ({ m }) => (
      <VStack gap={0}>
        <Text weight="semibold">{valueOf(m)}</Text>
        {isNarrow ? small(aimOf(m, zone)) : null}
      </VStack>
    ),
  };
  const aim: TableColumn<Row> = {
    key: "aim",
    header: "Should be",
    width: proportional(2, { minWidth: 100 }),
    renderCell: ({ m }) => <Text color="secondary">{aimOf(m, zone)}</Text>,
  };
  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={2}>What these count</Heading>
        {small("Read where the manager cannot write, or said by a person. Where there is no number yet, it says when.")}
      </VStack>
      <Table<Row>
        data={measures.map((m) => ({ id: m.tile.id, m }))}
        columns={isNarrow ? [name, now] : [name, counts, before, now, aim]}
        idKey="id"
        dividers="rows"
      />
    </VStack>
  );
}

import { HStack, VStack } from "@astryxdesign/core/Layout";
import { StatusDot, type StatusDotVariant } from "@astryxdesign/core/StatusDot";
import { Table, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import type { Measure } from "./measures";

const DOT: Readonly<Record<Measure["state"], readonly [StatusDotVariant, string]>> = { good: ["success", "Good"], behind: ["warning", "Behind"], "not yet": ["neutral", "Not yet"] };
interface Row extends Record<string, unknown> { id: string; m: Measure }
const small = (t: string) => <Text type="supporting" color="secondary">{t}</Text>;

/** Each number in words: what it counts, where it is read, what it was before, what it should be. */
export function What({ measures }: { measures: readonly Measure[] }) {
  const isNarrow = useMediaQuery("(max-width: 700px)");
  const name: TableColumn<Row> = { key: "name", header: "Measure", width: proportional(3, { minWidth: 150 }), renderCell: ({ m }) => (
    <HStack gap={2} vAlign="start"><StatusDot variant={DOT[m.state][0]} label={DOT[m.state][1]} /><VStack gap={0}><Text weight="semibold">{m.name}</Text>{small(m.isGuard ? "Must not get worse" : "Result")}</VStack></HStack>
  ) };
  const counts: TableColumn<Row> = { key: "counts", header: "What it counts", width: proportional(5, { minWidth: 200 }), renderCell: ({ m }) => <VStack gap={0}><Text>{m.counts}</Text>{small(m.read)}</VStack> };
  const before: TableColumn<Row> = { key: "before", header: "Before", width: proportional(2, { minWidth: 88 }), renderCell: ({ m }) => <Text color="secondary">{m.before}</Text> };
  const now: TableColumn<Row> = { key: "now", header: "Now", width: proportional(2, { minWidth: 76 }), renderCell: ({ m }) => <VStack gap={0}><Text weight="semibold">{m.value}</Text>{isNarrow && small(m.aim)}</VStack> };
  const aim: TableColumn<Row> = { key: "aim", header: "Should be", width: proportional(2, { minWidth: 100 }), renderCell: ({ m }) => <Text color="secondary">{m.aim}</Text> };
  return (
    <VStack gap={6}>
      <VStack gap={1}>
        <Heading level={2}>What these count</Heading>
        <Text type="supporting" color="secondary">Read where the manager cannot write, or said by a person. Where there is no number yet, it says when.</Text>
      </VStack>
      <Table<Row> data={measures.map((m) => ({ id: m.id, m }))} columns={isNarrow ? [name, now] : [name, counts, before, now, aim]} idKey="id" dividers="rows" />
    </VStack>
  );
}

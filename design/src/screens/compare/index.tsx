// astryx-template: table-comparison
import { useMemo, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Table, pixel, proportional, useTableGroupedRows, useTableStickyColumns, type TableColumn } from "@astryxdesign/core/Table";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";
import { DIFFER, GROUPS, LINES, type Differ, type Line, type Side } from "./data";
import { styles } from "./styles";

interface Row extends Record<string, unknown> { id: string; line: Line }
interface DiffRow extends Record<string, unknown> { id: string; d: Differ }

/** The better value of a row. A row with no direction, or the same on both sides, marks nothing: a tie is not a win. */
const bestOf = (l: Line): number | undefined => {
  if (l.better === undefined || l.six.n === undefined || l.seven.n === undefined || l.six.n === l.seven.n) return undefined;
  return l.better === "higher" ? Math.max(l.six.n, l.seven.n) : Math.min(l.six.n, l.seven.n);
};
const Cell = ({ side, isBest, isNumber }: { side: Side; isBest: boolean; isNumber: boolean }) => (
  <VStack gap={0.5} hAlign="end" xstyle={isBest ? styles.best : undefined}>
    <Text type="body" hasTabularNumbers={isNumber} weight={isBest ? "semibold" : "normal"} align="end">{side.text}</Text>
    {side.note !== undefined && <Text type="supporting" color="secondary" align="end">{side.note}</Text>}
  </VStack>
);

/** Version 6 of Sales’s playbook beside the proposed 7, on the same past cases. The manager’s name and tabs are above. */
export default function Compare() {
  const isNarrow = useMediaQuery("(max-width: 700px)");
  const showToast = useToast();
  const [chosen, setChosen] = useState<"6" | "7" | null>(null);
  const [shut, setShut] = useState<ReadonlySet<string>>(new Set());
  const columns = useMemo<TableColumn<Row>[]>(() => {
    const side = (key: "six" | "seven", head: string, tag: JSX.Element): TableColumn<Row> => ({
      key, width: proportional(1, { minWidth: isNarrow ? 112 : 200 }), align: "end",
      header: <VStack gap={0.5} hAlign="end"><Text type="label">{head}</Text>{tag}</VStack>,
      renderCell: ({ line }) => <Cell side={line[key]} isNumber={line[key].n !== undefined} isBest={bestOf(line) !== undefined && line[key].n === bestOf(line)} />,
    });
    return [
      { key: "spec", header: "", width: pixel(isNarrow ? 96 : 220), renderCell: ({ line }) => <Text type="label" color="secondary">{line.label}</Text> },
      side("six", "Version 6", <Token size="sm" color="gray" label="Running" />),
      side("seven", "Version 7", <Token size="sm" color="blue" label="Proposed" />),
    ];
  }, [isNarrow]);
  const grouped = useTableGroupedRows<Row>({
    data: LINES.map((line) => ({ id: line.id, line })), groupBy: (r) => r.line.group, groupOrder: [...GROUPS], getRowKey: (r) => r.id,
    collapsedGroups: shut, onToggleGroup: (g: string) => setShut((s) => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; }),
    renderGroupHeader: (g: string) => <HStack gap={2} vAlign="center" xstyle={styles.group}><Heading level={3} accessibilityLevel={2}>{g}</Heading></HStack>,
  });
  const sticky = useTableStickyColumns<Row>({ startKeys: ["spec"] });
  const diffCols: TableColumn<DiffRow>[] = [
    { key: "what", header: "Case", width: proportional(2, { minWidth: isNarrow ? 88 : 140 }), renderCell: ({ d }) => <Text>{d.what}</Text> },
    { key: "six", header: "Version 6 did", width: proportional(2, { minWidth: isNarrow ? 88 : 140 }), renderCell: ({ d }) => <Text color="secondary">{d.six}</Text> },
    { key: "seven", header: "Version 7 would", width: proportional(2, { minWidth: isNarrow ? 88 : 140 }), renderCell: ({ d }) => <Text color="secondary">{d.seven}</Text> },
  ];
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={4}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill"><VStack gap={0.5}><Heading level={2}>Version 6 or version 7</Heading><Text type="supporting" color="secondary">Both tried on the same 28 past cases, sending nothing. Look for signs was the weakest part this week: 68%.</Text></VStack></StackItem>
            {chosen === null
              ? <HStack gap={2}><Button label="Keep 6" variant="secondary" onClick={() => { setChosen("6"); showToast({ body: "Kept 6. Version 7 is set aside, as a case for next time.", uniqueID: "keep" }); }} /><Button label="Use 7" variant="primary" onClick={() => { setChosen("7"); showToast({ body: "Saved as version 7. 4 open pieces of work were told.", uniqueID: "use" }); }} /></HStack>
              : <Text type="supporting" color="secondary">{chosen === "6" ? "Kept 6" : "Using 7"}</Text>}
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={6}>
            <Card padding={isNarrow ? 3 : 5} xstyle={styles.frame}>
              <Table<Row> data={grouped.data} columns={columns} idKey={grouped.idKey} density="spacious" dividers="rows" plugins={{ grouped: grouped.plugin, sticky }} />
            </Card>
            <VStack gap={3}>
              <VStack gap={0}><Heading level={3} accessibilityLevel={2}>Where they differ</Heading><Text type="supporting" color="secondary">6 of the 28. On the other 22 they did the same.</Text></VStack>
              <Card padding={isNarrow ? 3 : 5} xstyle={styles.frame}><Table<DiffRow> data={DIFFER.map((d) => ({ id: d.id, d }))} columns={diffCols} idKey="id" dividers="rows" density="compact" verticalAlign="top" /></Card>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

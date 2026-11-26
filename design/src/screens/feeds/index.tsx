// astryx-template: table-collapsible
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Table, pixel, proportional, useTableRowExpansion, useTableSortable, useTableSortableState, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { colorVars, radiusVars } from "@astryxdesign/core/theme/tokens.stylex";
import { BoltIcon, ClockIcon, HandRaisedIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { FEEDS, type By, type Feed } from "../../sales";
import { go } from "../../shell";

interface Row extends Record<string, unknown> { id: string; name: string; from: string; when: string; makes: string; came: number; took: number; cost: number; f: Feed }
const rowsOf = (by: By): Row[] => FEEDS.filter((f) => f.by === by).map((f) => ({ id: f.id, name: f.name, from: f.from, when: f.when, makes: f.makes, came: f.came, took: f.took, cost: f.cost, f }));
const GROUPS: readonly { by: By; title: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { by: "event", title: "Arrives", icon: BoltIcon }, { by: "search", title: "Goes and looks", icon: MagnifyingGlassIcon },
  { by: "waiting", title: "Becomes true", icon: ClockIcon }, { by: "hand", title: "Is handed", icon: HandRaisedIcon },
];
const total = (rows: readonly Row[], k: "came" | "took" | "cost") => rows.reduce((n, r) => n + r[k], 0);

const styles = stylex.create({
  wash: { backgroundColor: colorVars["--color-background-body"] },
  categoryTile: { display: "grid", placeItems: "center", width: 24, height: 24, flexShrink: 0, borderRadius: radiusVars["--radius-inner"], backgroundColor: colorVars["--color-background-muted"] },
});

const nameCell = (r: Row, extra?: string) => <VStack gap={0}><Text maxLines={1}>{r.name}</Text><Text type="supporting" color="secondary" maxLines={1}>{extra ?? r.from}</Text></VStack>;
const num = (n: number | string) => <Text hasTabularNumbers>{String(n)}</Text>;
const WIDE: TableColumn<Row>[] = [
  { key: "name", header: "Feed", width: proportional(2, { minWidth: 200 }), sortable: true, renderCell: (r) => nameCell(r) },
  { key: "when", header: "When", width: pixel(168), renderCell: (r) => <Text color="secondary" maxLines={1}>{r.when}</Text> },
  { key: "makes", header: "Becomes", width: proportional(2, { minWidth: 180 }), renderCell: (r) => <Text color="secondary" maxLines={1}>{r.makes}</Text> },
  { key: "came", header: "Came", width: pixel(92), align: "end", sortable: true, renderCell: (r) => num(r.came) },
  { key: "took", header: "Taken on", width: pixel(112), align: "end", sortable: true, renderCell: (r) => (r.f.note ? <Text color="secondary">{r.f.note}</Text> : num(r.took)) },
  { key: "cost", header: "Cost", width: pixel(88), align: "end", sortable: true, renderCell: (r) => num(`$${r.cost}`) },
];
const COMPACT: TableColumn<Row>[] = [
  { key: "name", header: "Feed", width: proportional(1, { minWidth: 150 }), renderCell: (r) => nameCell(r, r.when) },
  { key: "took", header: "Taken on", width: pixel(104), align: "end", renderCell: (r) => <Text hasTabularNumbers color={r.f.note ? "secondary" : "primary"}>{r.f.note ?? `${r.took} of ${r.came}`}</Text> },
];

function useSurfaceWidth() {
  const ref = useRef<HTMLDivElement>(null); const [w, setW] = useState(0);
  useLayoutEffect(() => { if (ref.current) setW(ref.current.clientWidth); }, []);
  useEffect(() => { const el = ref.current; if (!el) return; const o = new ResizeObserver(() => setW(el.clientWidth)); o.observe(el); return () => o.disconnect(); }, []);
  return [ref, w] as const;
}

function FeedGroup({ icon, title, count, value, isOpen, onOpenChange, children }: { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; count: number; value: string; isOpen: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  return (
    <Card padding={2}>
      <Collapsible isOpen={isOpen} onOpenChange={onOpenChange} trigger={
        <HStack gap={2} vAlign="center" hAlign="between" paddingBlock={2} paddingInline={2}>
          <HStack gap={2} vAlign="center"><HStack xstyle={styles.categoryTile}><Icon icon={icon} size="sm" /></HStack><Text weight="semibold">{title}</Text><Badge variant="neutral" label={String(count)} /></HStack>
          <HStack gap={2} vAlign="center"><Text color="secondary">Taken on</Text><Text weight="semibold" hasTabularNumbers>{value}</Text></HStack>
        </HStack>
      }>
        <VStack paddingBlockStart={3}>{children}</VStack>
      </Collapsible>
    </Card>
  );
}

function FeedTable({ data, isCompact, open, onToggle }: { data: Row[]; isCompact: boolean; open: Set<string>; onToggle: (k: string) => void }) {
  const { sortedData, sortConfig } = useTableSortableState<Row>({ data });
  const sort = useTableSortable<Row>(sortConfig);
  const expansion = useTableRowExpansion<Row>({ expandedKeys: open, onToggle, getRowKey: (r) => r.id, renderExpanded: (r) => (
    <VStack gap={3} padding={3}>
      <MetadataList columns={isCompact ? "single" : "multi"} label={{ position: "top" }}>{r.f.more.map(([k, v]) => <MetadataListItem key={k} label={k}>{v}</MetadataListItem>)}</MetadataList>
      {r.f.by === "search" && <HStack><Button label="Open" size="sm" onClick={() => go("m-sales-search")} /></HStack>}
    </VStack>
  ) });
  return <Table data={sortedData} columns={isCompact ? COMPACT : WIDE} idKey="id" density="compact" dividers="rows" plugins={{ sort, expansion }} />;
}

/** Everything that brings something in, by how it does. Each kind has its own card; all of them meet the same policy. */
export default function Feeds() {
  const [openGroups, setOpenGroups] = useState<Set<By>>(() => new Set(GROUPS.map((g) => g.by)));
  const [rows, setRows] = useState<Set<string>>(() => new Set(["signals"]));
  const [ref, width] = useSurfaceWidth();
  const isCompact = width > 0 && width < 720;
  const isAll = openGroups.size === GROUPS.length && rows.size === FEEDS.length;
  const flip = <T,>(s: Set<T>, k: T) => { const n = new Set(s); if (!n.delete(k)) n.add(k); return n; };
  const came = total(rowsOf("event").concat(rowsOf("search"), rowsOf("waiting"), rowsOf("hand")), "came");
  return (
    <Layout height="fill" contentWidth={1200} xstyle={styles.wash}
      header={
        <LayoutHeader padding={4}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill"><VStack gap={0.5}><Heading level={2}>Where it comes from</Heading><Text type="supporting">{`${came} came in over 7 days, from ${FEEDS.length} feeds`}</Text></VStack></StackItem>
            <Button label={isAll ? "Collapse all" : "Expand all"} variant="ghost" onClick={() => { setOpenGroups(isAll ? new Set() : new Set(GROUPS.map((g) => g.by))); setRows(isAll ? new Set() : new Set(FEEDS.map((f) => f.id))); }} />
            <Button label="What came in" variant="secondary" onClick={() => go("m-sales-intake")} />
            <Button label="Add a feed" variant="primary" icon={<Icon icon={PlusIcon} size="sm" />} onClick={() => go("home")} />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={4} ref={ref}>
            {GROUPS.map((g) => { const data = rowsOf(g.by); return (
              <FeedGroup key={g.by} icon={g.icon} title={g.title} count={data.length} value={`${total(data, "took")} of ${total(data, "came")}`} isOpen={openGroups.has(g.by)} onOpenChange={() => setOpenGroups((s) => flip(s, g.by))}>
                <FeedTable data={data} isCompact={isCompact} open={rows} onToggle={(k) => setRows((s) => flip(s, k))} />
              </FeedGroup>
            ); })}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

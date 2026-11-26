// astryx-template: table
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, useTableSortable, useTableSortableState, type TableColumn } from "@astryxdesign/core/Table";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Switch } from "@astryxdesign/core/Switch";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { EllipsisHorizontalIcon, PlusIcon } from "@heroicons/react/24/outline";
import { ROUTINES, type Routine } from "../../juno/world";
import { go } from "../../shell";

type Row = Routine & Record<string, unknown>;
const DOT = { done: "success", asked: "warning", failed: "error" } as const;
const WORD = { done: "Done", asked: "Asked a person", failed: "Failed" } as const;

/** Work that starts by the clock. `by`: only those of these parts of Juno; without it, all. */
export function RoutineTable({ by }: { by?: readonly string[] }) {
  const showToast = useToast();
  const [rows, setRows] = useState<Row[]>(() => ROUTINES.filter((r) => !by || by.includes(r.by)).map((r) => ({ ...r })));
  const { sortedData, sortConfig } = useTableSortableState<Row>({ data: rows, comparators: { name: (a, b) => a.name.localeCompare(b.name), by: (a, b) => a.by.localeCompare(b.by) } });
  const sortable = useTableSortable<Row>(sortConfig);
  const columns: TableColumn<Row>[] = [
    { key: "name", header: "What", width: proportional(1.4, { minWidth: 200 }), sortable: true, renderCell: (r) => <Text type="body" maxLines={1}>{r.name}</Text> },
    { key: "when", header: "When", width: proportional(1, { minWidth: 150 }), renderCell: (r) => <Text type="body" maxLines={1}>{r.when}</Text> },
    { key: "by", header: "Who does it", width: pixel(124), sortable: true, renderCell: (r) => <Text type="body" color="secondary" maxLines={1}>{r.by}</Text> },
    { key: "last", header: "Last time", width: proportional(1, { minWidth: 160 }), renderCell: (r) => <HStack gap={2} vAlign="center"><StatusDot variant={DOT[r.lastState]} label={WORD[r.lastState]} /><Text type="body" maxLines={1}>{r.last}</Text></HStack> },
    { key: "next", header: "Next", width: pixel(128), renderCell: (r) => <Text type="supporting" color="secondary">{r.on ? r.next : "Off"}</Text> },
    { key: "on", header: "On", width: pixel(64), renderCell: (r) => <Switch label={`${r.name} is on`} isLabelHidden value={r.on} onChange={(on: boolean) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, on } : y)))} /> },
    { key: "more", header: <VisuallyHidden>Actions</VisuallyHidden>, width: pixel(56), renderCell: (r) => (
      <DropdownMenu hasChevron={false} alignment="end" button={{ label: `Actions for ${r.name}`, variant: "ghost", size: "sm", icon: <Icon icon={EllipsisHorizontalIcon} size="sm" />, isIconOnly: true }}
        items={[{ label: "Run it now", onClick: () => showToast({ body: `${r.name}: started`, uniqueID: r.id }) }, { label: "What it did before", onClick: () => go("soon-Runs") }, { label: "Change it", onClick: () => go("soon-Routine") }]} />
    ) },
  ];
  return (
    <Layout height="fill"
      header={
        <LayoutHeader hasDivider padding={4}>
          <HStack wrap="wrap" gap={3} vAlign="center">
            <StackItem size="fill"><VStack gap={1}><Heading level={by ? 2 : 1}>Routines</Heading><Text type="supporting" color="secondary">What starts by the clock. Say one to Juno, or make it here.</Text></VStack></StackItem>
            <Button label="New routine" variant="primary" icon={<Icon icon={PlusIcon} />} onClick={() => go("soon-New routine")} />
          </HStack>
        </LayoutHeader>
      }
      content={<LayoutContent role="main" padding={0}><Table<Row> data={sortedData} columns={columns} idKey="id" density="balanced" dividers="rows" textOverflow="truncate" hasHover plugins={{ sortable }} /></LayoutContent>}
    />
  );
}

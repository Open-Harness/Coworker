// astryx-template: table
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, useTableSortable, useTableSortableState, type TableColumn } from "@astryxdesign/core/Table";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { TRIGGERS, type TriggerLine } from "../../juno/world";
import { go } from "../../shell";

type Row = TriggerLine & Record<string, unknown>;
const DOT = { done: "success", asked: "warning", failed: "error" } as const;
const WORD = { done: "Done", asked: "Asked a person", failed: "Failed" } as const;

/** Every trigger of every manager, in one table. Each is changed in the playbook it belongs to. */
export function JunoTriggers() {
  const showToast = useToast();
  const [rows, setRows] = useState<Row[]>(() => TRIGGERS.map((r) => ({ ...r })));
  const { sortedData, sortConfig } = useTableSortableState<Row>({ data: rows, comparators: { name: (a, b) => a.name.localeCompare(b.name), of: (a, b) => a.of.localeCompare(b.of) } });
  const sortable = useTableSortable<Row>(sortConfig);
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const all: TableColumn<Row>[] = [
    { key: "name", header: "What", width: proportional(1.4, { minWidth: isNarrow ? 150 : 200 }), sortable: true, renderCell: (r) => isNarrow ? <VStack gap={0}><Text type="body" maxLines={1}>{r.name}</Text><Text type="supporting" color="secondary" maxLines={1}>{r.when}</Text></VStack> : <Text type="body" maxLines={1}>{r.name}</Text> },
    { key: "when", header: "When", width: proportional(1, { minWidth: 150 }), renderCell: (r) => <VStack gap={0}><Text type="body" maxLines={1}>{r.when}</Text><Text type="supporting" color="secondary">{r.by}</Text></VStack> },
    { key: "of", header: "Playbook", width: pixel(124), sortable: true, renderCell: (r) => <Text type="body" color="secondary" maxLines={1}>{r.of}</Text> },
    { key: "last", header: "Last time", width: proportional(1, { minWidth: 160 }), renderCell: (r) => <HStack gap={2} vAlign="center"><StatusDot variant={DOT[r.lastState]} label={WORD[r.lastState]} /><Text type="body" maxLines={1}>{r.last}</Text></HStack> },
    { key: "next", header: "Next", width: pixel(128), renderCell: (r) => <Text type="supporting" color="secondary">{r.on ? r.next : "Off"}</Text> },
    { key: "on", header: "On", width: pixel(64), renderCell: (r) => <Switch label={`${r.name} is on`} isLabelHidden value={r.on} onChange={(on: boolean) => setRows((x) => x.map((y) => (y.id === r.id ? { ...y, on } : y)))} /> },
    { key: "more", header: <VisuallyHidden>Actions</VisuallyHidden>, width: pixel(56), renderCell: (r) => (
      <DropdownMenu hasChevron={false} alignment="end" button={{ label: `Actions for ${r.name}`, variant: "ghost", size: "sm", icon: <Icon icon={EllipsisHorizontalIcon} size="sm" />, isIconOnly: true }}
        items={[{ label: "Run it now", onClick: () => showToast({ body: `${r.name}: started`, uniqueID: r.id }) }, { label: "What it did before", onClick: () => go("soon-Runs") }, { label: "Change it", onClick: () => go(r.to) }]} />
    ) },
  ];
  const columns = isNarrow ? all.filter((c) => ["name", "on", "more"].includes(c.key as string)) : all;
  return (
    <Layout height="fill"
      header={<LayoutHeader hasDivider={false} padding={4}><HStack gap={2} vAlign="center" wrap="wrap"><StackItem size="fill"><Text type="supporting" color="secondary">What makes something come in, for all managers. Each is changed in the playbook it belongs to.</Text></StackItem><Button label="Add one" size="sm" variant="secondary" onClick={() => go("home")} /></HStack></LayoutHeader>}
      content={<LayoutContent role="main" padding={0}><Table<Row> data={sortedData} columns={columns} idKey="id" density="balanced" dividers="rows" textOverflow="truncate" hasHover plugins={{ sortable }} /></LayoutContent>}
    />
  );
}

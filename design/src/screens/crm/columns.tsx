import { useEffect, useMemo, useRef } from "react";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { useHoverCard } from "@astryxdesign/core/HoverCard";
import { Link } from "@astryxdesign/core/Link";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { pixel, proportional } from "@astryxdesign/core/Table";
import type { TableColumn, TablePlugin, TableSortComparator } from "@astryxdesign/core/Table";
import { lastOf, money, STAGES, whenOf } from "./data";
import type { Row } from "./data";

export const SEARCH_FIELDS = [
  { key: "name", type: "string", label: "Deal" },
  { key: "stage", type: "enum", label: "Stage", enumValues: Object.entries(STAGES).map(([value, s]) => ({ value, label: s.label })) },
  { key: "value", type: "number", label: "Value" },
  { key: "owner", type: "enum", label: "Owner", enumValues: [{ value: "Sales", label: "Sales" }, { value: "Ama Mensah", label: "Ama Mensah" }, { value: "Bo Larsen", label: "Bo Larsen" }] },
] as const;

function Figure({ children }: { children: string }) {
  return <Text hasTabularNumbers>{children}</Text>;
}

/** Deal and company. The link opens the deal; the card shows the rest when the row is hovered or focused. */
function DealCell({ item, onOpen }: { item: Row; onOpen: (id: string) => void }) {
  const anchorRef = useRef<HTMLElement>(null);
  const hoverCard = useHoverCard({ placement: "below", alignment: "start", label: `${item.name} details`, focusTrigger: "always" });
  const attach = hoverCard.ref;
  const cardId = hoverCard.id;
  useEffect(() => {
    const row = anchorRef.current?.closest("tr");
    if (row == null) return;
    attach(row);
    row.tabIndex = 0;
    row.setAttribute("aria-describedby", cardId);
    return () => { attach(null); row.removeAttribute("aria-describedby"); };
  }, [attach, cardId]);

  return (
    <>
      <VStack gap={0}>
        <Link href="#" color="primary" weight="medium" maxLines={1} onClick={(e) => { e.preventDefault(); onOpen(item.id); }}>{item.name}</Link>
        <Text type="supporting" color="secondary" maxLines={1} ref={anchorRef}>{item.company}</Text>
      </VStack>
      {hoverCard.renderHoverCard(
        <VStack gap={3} width={280}>
          <Heading level={3} accessibilityLevel={2}>{item.company}</Heading>
          <MetadataList label={{ position: "start" }}>
            <MetadataListItem label="Deal">{item.name}</MetadataListItem>
            <MetadataListItem label="Stage">{STAGES[item.stage].label}</MetadataListItem>
            <MetadataListItem label="Value">{money(item.value)}</MetadataListItem>
            <MetadataListItem label="Owner">{item.owner}</MetadataListItem>
            <MetadataListItem label="Work">{item.work ?? "None"}</MetadataListItem>
          </MetadataList>
          <Button label="Open deal" variant="secondary" width="100%" onClick={() => onOpen(item.id)} />
        </VStack>,
      )}
    </>
  );
}

const makeAll = (onOpen: (id: string) => void, isNarrow: boolean): TableColumn<Row>[] => [
  { key: "name", header: "Deal", width: proportional(3, { minWidth: isNarrow ? 150 : 200 }), sortable: true, filter: "name", renderCell: (item) => <DealCell item={item} onOpen={onOpen} /> },
  { key: "stage", header: "Stage", width: pixel(isNarrow ? 136 : 140), sortable: true, filter: "stage", renderCell: (item) => <Text color="secondary" maxLines={1}>{STAGES[item.stage].label}</Text> },
  { key: "value", header: "Value", width: pixel(100), align: "end", sortable: true, filter: "value", renderCell: (item) => <Figure>{money(item.value)}</Figure> },
  {
    key: "owner", header: "Owner", width: pixel(150), sortable: true, filter: "owner",
    renderCell: (item) => (
      <HStack gap={2} vAlign="center">
        {item.owner === "Sales" ? null : <Avatar name={item.owner} size="sm" />}
        <Text color={item.owner === "Sales" ? "secondary" : "primary"} maxLines={1}>{item.owner}</Text>
      </HStack>
    ),
  },
  {
    key: "last", header: "Last change", width: proportional(3, { minWidth: 220 }), sortable: true,
    renderCell: (item) => {
      const last = lastOf(item);
      return (
        <VStack gap={0}>
          <Text maxLines={1}>{last.text}</Text>
          <Text type="supporting" color="secondary" maxLines={1} hasTabularNumbers>{`${last.who}, ${whenOf(last.at)}`}</Text>
        </VStack>
      );
    },
  },
  { key: "work", header: "Work", width: pixel(100), sortable: true, renderCell: (item) => <Text color="secondary" maxLines={1}>{item.work ?? "–"}</Text> },
];

/** On a phone: the deal and its stage. The rest is on the deal. */
export const makeColumns = (onOpen: (id: string) => void, isNarrow = false): TableColumn<Row>[] => makeAll(onOpen, isNarrow).filter((c) => !isNarrow || c.key === "name" || c.key === "stage");

export const COMPARATORS: Partial<Record<string, TableSortComparator<Row>>> = {
  name: (a, b) => a.name.localeCompare(b.name),
  stage: (a, b) => a.stage.localeCompare(b.stage),
  value: (a, b) => a.value - b.value,
  owner: (a, b) => a.owner.localeCompare(b.owner),
  last: (a, b) => a.stamp - b.stamp,
  work: (a, b) => (a.work ?? "~").localeCompare(b.work ?? "~"),
};

const FLUSH_START: React.CSSProperties = { paddingInlineStart: 0 };
const FLUSH_END: React.CSSProperties = { paddingInlineEnd: 0 };
const edgeStyle = (index: number, total: number): React.CSSProperties | undefined => (index === 0 ? FLUSH_START : index === total - 1 ? FLUSH_END : undefined);

/** Lets the first and last columns sit on the same line as the content around the table. */
export function useFlushEdges(): TablePlugin<Row> {
  return useMemo(
    () => ({
      transformHeaderCell: (props, _column, index, cols) => {
        const style = edgeStyle(index, cols.length);
        return style == null ? props : { ...props, htmlProps: { ...props.htmlProps, style: { ...props.htmlProps.style, ...style } } };
      },
      transformBodyCell: (props, _column, _item, index, cols) => {
        const style = edgeStyle(index, cols.length);
        return style == null ? props : { ...props, htmlProps: { ...props.htmlProps, style: { ...props.htmlProps.style, ...style } } };
      },
    }),
    [],
  );
}

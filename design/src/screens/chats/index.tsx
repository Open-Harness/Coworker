// astryx-template: table
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, Table, useTableTreeData, useTableTreeState, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { CHATS, type Chat } from "../../juno/world";
import { go } from "../../shell";

interface Row extends Record<string, unknown> { id: string; c: Chat; depth: number; children?: Row[] }
const rowsOf = (cs: readonly Chat[], at: string, depth = 0): Row[] => cs.map((c, i) => ({ id: `${at}${i}`, c, depth, ...(c.forks ? { children: rowsOf(c.forks, `${at}${i}-`, depth + 1) } : {}) }));
const ROWS = rowsOf(CHATS, "c");
const ALL = CHATS.reduce((n, c) => n + 1 + (c.forks?.length ?? 0), 0);
const DOT = { working: "success", waiting: "warning", quiet: "neutral" } as const;
const WORD = { working: "Juno is on it", quiet: "Quiet" } as const;
const wordOf = (c: Chat) => (c.state === "waiting" ? `Waits for ${c.for}` : WORD[c.state]);

const columnsFor = (isNarrow: boolean): TableColumn<Row>[] => [

  { key: "title", header: "Chat", width: proportional(1.4, { minWidth: isNarrow ? 160 : 220 }), renderCell: (r) => <Link href={`#${r.c.id}`}>{r.c.title}</Link> },
  ...(isNarrow ? [] : [{ key: "who", header: "With", width: proportional(1, { minWidth: 170 }), renderCell: (r) => <HStack gap={2} vAlign="center"><Avatar name={r.c.who} size="sm" tooltip={false} /><Text type="body" maxLines={1}>{r.c.who}</Text></HStack> },
  { key: "where", header: "Where", width: proportional(1, { minWidth: 150 }), renderCell: (r) => <Text type="body" color="secondary" maxLines={1}>{r.c.knew ? `Forked, knew ${r.c.knew} messages` : r.c.where}</Text> }] as TableColumn<Row>[]),
  { key: "state", header: "Now", width: pixel(isNarrow ? 136 : 168), renderCell: (r) => <HStack gap={2} vAlign="center"><StatusDot variant={DOT[r.c.state]} label={wordOf(r.c)} /><Text type="body">{wordOf(r.c)}</Text></HStack> },
  ...(isNarrow ? [] : [{ key: "last", header: "Newest", width: pixel(100), renderCell: (r) => <Text type="supporting" color="secondary">{r.c.last}</Text> }] as TableColumn<Row>[]),
];

/** Every conversation anybody has with Juno, wherever it is held. A fork is under what it was forked from. */
export default function Chats() {
  const columns = columnsFor(useMediaQuery("(max-width: 768px)"));
  const [expandedIds, setExpanded] = useState<ReadonlySet<string>>(() => new Set(ROWS.filter((r) => r.children).map((r) => r.id)));
  const { visibleData, treeConfig } = useTableTreeState<Row>({ data: ROWS, idKey: "id", expandedIds, onExpandedIdsChange: setExpanded });
  const tree = useTableTreeData({ ...treeConfig });
  return (
    <Layout height="fill"
      header={
        <LayoutHeader hasDivider padding={4}>
          <VStack gap={2}>
            <HStack wrap="wrap" gap={3} vAlign="center">
              <StackItem size="fill"><VStack gap={0}><Heading level={1}>Chats</Heading><Text type="supporting" color="secondary">{`${ALL} chats, here, in Slack, by mail, on WhatsApp and on GitHub. Juno is one, wherever you speak to it.`}</Text></VStack></StackItem>
              <Button label="New chat" variant="primary" icon={<Icon icon={PencilSquareIcon} />} onClick={() => go("home")} />
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={<LayoutContent role="main" padding={0}><Table<Row> data={visibleData} columns={columns} idKey="id" density="balanced" dividers="rows" textOverflow="truncate" hasHover plugins={{ tree }} /></LayoutContent>}
    />
  );
}

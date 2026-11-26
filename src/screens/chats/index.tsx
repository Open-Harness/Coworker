// astryx-template: table
import { useMemo, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, Table, useTableTreeData, useTableTreeState, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { Reading, useClock, useGo, useHref } from "~/modules/page/service.ts";
import type { Chat } from "~/modules/coworker/types.ts";
import type { ChatsView } from "~/modules/views-workspace/types.ts";
import { rowsOf, type Row } from "./rows.ts";

const DOT = { working: "success", waits: "warning", quiet: "neutral" } as const;
const WORD = { working: "Juno is on it", quiet: "Quiet" } as const;
const wordOf = (chat: Chat) => (chat.state === "waits" ? `Waits for ${chat.waitsFor ?? "someone"}` : WORD[chat.state]);

function useColumns(isNarrow: boolean): TableColumn<Row>[] {
  const href = useHref();
  const clock = useClock();
  return useMemo(
    (): TableColumn<Row>[] => [
      {
        key: "title",
        header: "Chat",
        width: proportional(1.4, { minWidth: isNarrow ? 160 : 220 }),
        renderCell: (row) => <Link href={href(`/chats/${row.chat.id}`)}>{row.chat.title}</Link>,
      },
      ...(isNarrow
        ? []
        : ([
            {
              key: "who",
              header: "With",
              width: proportional(1, { minWidth: 170 }),
              renderCell: (row) => (
                <HStack gap={2} vAlign="center">
                  <Avatar name={row.chat.with} size="sm" tooltip={false} />
                  <Text type="body" maxLines={1}>
                    {row.chat.with}
                  </Text>
                </HStack>
              ),
            },
            {
              key: "where",
              header: "Where",
              width: proportional(1, { minWidth: 150 }),
              renderCell: (row) => (
                <Text type="body" color="secondary" maxLines={1}>
                  {row.chat.knew === null ? row.chat.where : `Forked, knew ${row.chat.knew} messages`}
                </Text>
              ),
            },
          ] as TableColumn<Row>[])),
      {
        key: "state",
        header: "Now",
        width: pixel(isNarrow ? 136 : 168),
        renderCell: (row) => (
          <HStack gap={2} vAlign="center">
            <StatusDot variant={DOT[row.chat.state]} label={wordOf(row.chat)} />
            <Text type="body">{wordOf(row.chat)}</Text>
          </HStack>
        ),
      },
      ...(isNarrow
        ? []
        : ([
            {
              key: "last",
              header: "Newest",
              width: pixel(100),
              renderCell: (row) => (
                <Text type="supporting" color="secondary">
                  {clock.short(row.chat.last)}
                </Text>
              ),
            },
          ] as TableColumn<Row>[])),
    ],
    [isNarrow, href, clock],
  );
}

/** Every conversation anybody has with Juno, wherever it is held. A fork is under what it was forked from. */
function Chats({ view }: { readonly view: ChatsView }) {
  const go = useGo();
  const columns = useColumns(useMediaQuery("(max-width: 768px)"));
  const rows = useMemo(() => rowsOf(view.chats), [view.chats]);
  const [expandedIds, setExpanded] = useState<ReadonlySet<string>>(() => new Set(rows.filter((row) => row.children).map((row) => row.id)));
  const { visibleData, treeConfig } = useTableTreeState<Row>({ data: rows, idKey: "id", expandedIds, onExpandedIdsChange: setExpanded });
  const tree = useTableTreeData({ ...treeConfig });
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={4}>
          <VStack gap={2}>
            <HStack wrap="wrap" gap={3} vAlign="center">
              <StackItem size="fill">
                <VStack gap={0}>
                  <Heading level={1}>Chats</Heading>
                  <Text
                    type="supporting"
                    color="secondary"
                  >{`${view.chats.length} chats, here, in Slack, by mail, on WhatsApp and on GitHub. Juno is one, wherever you speak to it.`}</Text>
                </VStack>
              </StackItem>
              <Button label="New chat" variant="primary" icon={<Icon icon={PencilSquareIcon} />} onClick={() => go("/")} />
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={0}>
          {rows.length === 0 ? (
            <VStack padding={6}>
              <EmptyState title="No chats yet" description="Say something to Juno and it shows here." />
            </VStack>
          ) : (
            <Table<Row>
              data={visibleData}
              columns={columns}
              idKey="id"
              density="balanced"
              dividers="rows"
              textOverflow="truncate"
              hasHover
              plugins={{ tree }}
            />
          )}
        </LayoutContent>
      }
    />
  );
}

export default function ChatsPage() {
  return (
    <Reading from="/chats" failed="We could not read the chats">
      {(view) => <Chats view={view} />}
    </Reading>
  );
}

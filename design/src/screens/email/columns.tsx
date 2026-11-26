import { useMemo } from "react";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { OverflowList } from "@astryxdesign/core/OverflowList";
import { Token } from "@astryxdesign/core/Token";
import type { UseContainerRevealReturn } from "@astryxdesign/core/hooks";
import { pixel, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import type { Conversation } from "./data";
import type { Act } from "./row-actions";
import { ReceivedCell, trailingWidth } from "./rows";

/** The list's columns, which change with the room the table has: stacked rows when narrow, no tags when tight. */
export function useColumns({ isStacked, isTight, isTouch, reveal, onAct }: { isStacked: boolean; isTight: boolean; isTouch: boolean; reveal: UseContainerRevealReturn; onAct: Act }): TableColumn<Conversation>[] {
  return useMemo((): TableColumn<Conversation>[] => {
    const received: TableColumn<Conversation> = {
      key: "receivedAt",
      header: "Received",
      width: pixel(trailingWidth(isTouch)),
      align: "end",
      renderCell: (item) => <ReceivedCell item={item} reveal={reveal} isOverlaid={!isTouch} onAct={onAct} />,
    };

    if (isStacked) {
      // Stacked, the row stops being tabular: sender over subject, and the time. The preview goes; the pane reprints it.
      return [
        {
          key: "conversation",
          header: "Conversation",
          width: proportional(1, { minWidth: 120 }),
          renderCell: (item) => (
            <VStack gap={0.5}>
              <Text maxLines={1} weight={item.isUnread ? "semibold" : "normal"}>{item.sender}</Text>
              <Text maxLines={1} color="secondary">{item.subject}</Text>
            </VStack>
          ),
        },
        received,
      ];
    }

    const all: TableColumn<Conversation>[] = [
      {
        key: "sender",
        header: "From",
        width: pixel(190),
        renderCell: (item) => (
          <HStack gap={2} vAlign="center">
            <Avatar name={item.sender} size="sm" tooltip={false} />
            <Text maxLines={1} weight={item.isUnread ? "semibold" : "normal"}>{item.sender}</Text>
          </HStack>
        ),
      },
      {
        key: "subject",
        header: "Subject",
        width: proportional(3),
        renderCell: (item) => (
          <HStack gap={2} vAlign="center">
            {/* `static` is what makes the subject win: the preview is the only thing that can give. */}
            <StackItem size="static"><Text maxLines={1} weight={item.isUnread ? "semibold" : "normal"}>{item.subject}</Text></StackItem>
            <StackItem size="fill"><Text maxLines={1} color="secondary">— {item.preview}</Text></StackItem>
          </HStack>
        ),
      },
      {
        key: "tags",
        header: "Tags",
        width: pixel(200),
        renderCell: (item) => (
          /* OverflowList shows the tags that fit whole and collapses the rest to a count, so a tag is readable or honestly absent. */
          <OverflowList gap={1} behavior="observeParent"
            overflowRenderer={(hidden) => <Token size="sm" label={`+${hidden.length}`} description={hidden.map((entry) => entry.child.key).filter(Boolean).join(", ")} />}>
            {item.tags.map((tag) => <Token key={tag} size="sm" label={tag} />)}
          </OverflowList>
        ),
      },
      received,
    ];
    // Tags are the first thing worth losing: the subject is what people scan.
    return isTight ? all.filter((column) => column.key !== "tags") : all;
  }, [isStacked, isTight, isTouch, reveal, onAct]);
}

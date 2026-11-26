// astryx-template: table-inbox
import { useMemo } from "react";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Token } from "@astryxdesign/core/Token";
import { pixel, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import type { Item } from "./data.ts";
import { TIME_WIDTH } from "./rows.tsx";

const isLoud = (item: Item) => item.standing === "ask" || item.isNew;

/** What the row says about who it waits for, in words and not in colour alone. */
export const whoLine = (item: Item): string | undefined =>
  item.standing === "wait" && item.waitsFor ? `Waits for ${item.waitsFor}` : undefined;

/** The list's columns, which change with the room the table has: stacked rows when narrow, no kind column when tight. */
export function useColumns({ isStacked, isTight }: { isStacked: boolean; isTight: boolean }): TableColumn<Item>[] {
  return useMemo((): TableColumn<Item>[] => {
    const received: TableColumn<Item> = {
      key: "at",
      header: "Came",
      width: pixel(TIME_WIDTH),
      align: "end",
      renderCell: (item) => (
        <Text
          color="secondary"
          hasTabularNumbers
          justify="end"
          maxLines={1}
          hasTruncateTooltip={false}
          weight={isLoud(item) ? "semibold" : "normal"}
        >
          {item.at}
        </Text>
      ),
    };

    if (isStacked) {
      // Stacked, the row stops being tabular: who over what, and the time. The preview goes; the pane says it all.
      return [
        {
          key: "item",
          header: "What waits",
          width: proportional(1, { minWidth: 160 }),
          renderCell: (item) => (
            <VStack gap={0.5}>
              <HStack gap={2} vAlign="center">
                <Text maxLines={1} weight={isLoud(item) ? "semibold" : "normal"}>
                  {item.from}
                </Text>
                {item.isProposal ? <Token size="sm" color="blue" label="Proposed" /> : null}
                {whoLine(item) ? (
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {whoLine(item)}
                  </Text>
                ) : null}
              </HStack>
              <Text maxLines={1} color="secondary">
                {item.title}
              </Text>
            </VStack>
          ),
        },
        received,
      ];
    }

    const all: TableColumn<Item>[] = [
      {
        key: "from",
        header: "From",
        width: pixel(190),
        renderCell: (item) => (
          <HStack gap={2} vAlign="center">
            <Avatar name={item.from} size="sm" tooltip={false} />
            <Text maxLines={1} weight={isLoud(item) ? "semibold" : "normal"}>
              {item.from}
            </Text>
          </HStack>
        ),
      },
      {
        key: "title",
        header: "What",
        width: proportional(3),
        renderCell: (item) => (
          <HStack gap={2} vAlign="center">
            {/* `static` is what makes the title win: the preview is the only thing that can give. */}
            <StackItem size="static">
              <Text maxLines={1} weight={isLoud(item) ? "semibold" : "normal"}>
                {item.title}
              </Text>
            </StackItem>
            <StackItem size="fill">
              <Text maxLines={1} color="secondary">
                — {item.preview}
              </Text>
            </StackItem>
          </HStack>
        ),
      },
      {
        key: "tags",
        header: "Status",
        width: pixel(150),
        renderCell: (item) =>
          item.isProposal ? (
            <Token size="sm" color="blue" label="Proposed" />
          ) : (
            <Text type="supporting" color="secondary" maxLines={1}>
              {whoLine(item) ?? ""}
            </Text>
          ),
      },
      received,
    ];
    return isTight ? all.filter((column) => column.key !== "tags") : all;
  }, [isStacked, isTight]);
}

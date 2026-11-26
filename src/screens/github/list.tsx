import { useMemo } from "react";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional } from "@astryxdesign/core/Table";
import type { TablePlugin, TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { CheckCircleIcon, ExclamationCircleIcon, ArrowPathRoundedSquareIcon as PullIcon } from "@heroicons/react/24/outline";
import type { Item } from "./data.ts";

const OPEN_CELL = { backgroundColor: "var(--color-accent-muted)" };
const INSIDE = 'button, input, a, label, [role="button"], [role="menuitem"]';

export function KindIcon({ item }: { item: Item }) {
  const icon =
    item.state === "Open" ? (item.kind === "pr" ? PullIcon : ExclamationCircleIcon) : item.kind === "pr" ? PullIcon : CheckCircleIcon;
  return (
    <Icon icon={icon} size="sm" color="gray" label={`${item.kind === "pr" ? "Pull request" : "Issue"}, ${item.state.toLowerCase()}`} />
  );
}

const Waits = ({ item }: { item: Item }) => (
  <HStack gap={1.5} vAlign="center">
    {item.standing === "person" ? <StatusDot variant="warning" label="Waits for a person" /> : null}
    <Text maxLines={1} color={item.standing === "done" ? "secondary" : "primary"}>
      {item.waits}
    </Text>
  </HStack>
);

/** Columns change with the room: a title and what it waits for, or stacked when narrow. */
export function useColumns({ isStacked }: { isStacked: boolean }): TableColumn<Item>[] {
  return useMemo((): TableColumn<Item>[] => {
    const time: TableColumn<Item> = {
      key: "at",
      header: "Updated",
      width: pixel(96),
      align: "end",
      renderCell: (i) => (
        <Text color="secondary" hasTabularNumbers maxLines={1}>
          {i.at}
        </Text>
      ),
    };
    const title: TableColumn<Item> = {
      key: "title",
      header: "Title",
      width: proportional(3, { minWidth: 140 }),
      renderCell: (i) => (
        <HStack gap={2} vAlign="center">
          <KindIcon item={i} />
          <StackItem size="fill">
            <VStack gap={0}>
              <Text maxLines={1}>{i.title}</Text>
              <Text type="supporting" color="secondary" maxLines={1}>
                #{i.id} by {i.author}
              </Text>
            </VStack>
          </StackItem>
        </HStack>
      ),
    };
    if (isStacked)
      return [
        {
          ...title,
          renderCell: (i) => (
            <HStack gap={2} vAlign="center">
              <KindIcon item={i} />
              <StackItem size="fill">
                <VStack gap={0}>
                  <Text maxLines={1}>{i.title}</Text>
                  <HStack gap={1.5} vAlign="center">
                    {i.standing === "person" ? <StatusDot variant="warning" label="Waits for a person" /> : null}
                    <Text type="supporting" color="secondary" maxLines={1}>
                      #{i.id}, {i.waits}
                    </Text>
                  </HStack>
                </VStack>
              </StackItem>
            </HStack>
          ),
        },
        time,
      ];
    return [
      title,
      { key: "waits", header: "Waits for", width: proportional(2, { minWidth: 150 }), renderCell: (i) => <Waits item={i} /> },
      time,
    ];
  }, [isStacked]);
}

/** The row is the control: click, Enter and Space open it. */
export function useRows({ openId, onOpen }: { openId: string | null; onOpen: (i: Item) => void }): TablePlugin<Item> {
  return useMemo(
    () => ({
      transformBodyRow: (props, item) => ({
        ...props,
        htmlProps: {
          ...props.htmlProps,
          tabIndex: 0,
          "aria-current": item.id === openId ? true : undefined,
          onClick: (e) => {
            if (!(e.target as HTMLElement).closest(INSIDE)) onOpen(item);
          },
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(item);
            }
          },
        },
      }),
      transformBodyCell: (props, _c, item) =>
        item.id === openId ? { ...props, htmlProps: { ...props.htmlProps, style: { ...props.htmlProps.style, ...OPEN_CELL } } } : props,
    }),
    [openId, onOpen],
  );
}

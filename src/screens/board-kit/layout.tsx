// astryx-template: kanban-board
import type { CSSProperties, ReactNode } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { Section } from "@astryxdesign/core/Section";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { ArrowsUpDownIcon, FunnelIcon, InboxIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { BoardView } from "~/modules/views-manager/types.ts";
import type { DragState } from "./drag.ts";

export type Column = BoardView["columns"][number];
const VIEWS = [
  { value: "Kanban", label: "Kanban" },
  { value: "List", label: "List" },
  { value: "Console", label: "Console" },
];

/** Five or six steps share a wide pane; a narrow one scrolls sideways, and a phone stacks them. */
export const columnsStyle = (isWide: boolean, gap: 3 | 4): CSSProperties => ({
  flexDirection: isWide ? "row" : "column",
  overflowX: isWide ? "auto" : "hidden",
  overflowY: isWide ? "hidden" : "auto",
  height: "100%",
  padding: "var(--spacing-4)",
  gap: `var(--spacing-${gap})`,
});
export const shellStyle = (isWide: boolean, width: number): CSSProperties => ({
  flexShrink: 0,
  flexGrow: 1,
  minWidth: isWide ? width : 0,
  maxWidth: isWide ? 300 : "none",
  flexBasis: isWide ? width : "auto",
  width: isWide ? "auto" : "100%",
  height: isWide ? "100%" : "auto",
});
export const ghostStyle = (height: number): CSSProperties => ({
  height,
  borderRadius: "var(--radius-container)",
  backgroundColor: "var(--color-background-muted)",
});
export const floatingStyle = (drag: DragState): CSSProperties => ({
  position: "fixed",
  insetBlockStart: 0,
  insetInlineStart: 0,
  pointerEvents: "none",
  cursor: "grabbing",
  boxShadow: "var(--shadow-high)",
  zIndex: 1000,
  width: drag.width,
  transform: `translate(${drag.pointerX - drag.offsetX}px, ${drag.pointerY - drag.offsetY}px)`,
});
export const cardStyle = (isCarried: boolean): CSSProperties => ({
  cursor: "grab",
  userSelect: "none",
  touchAction: "manipulation",
  ...(isCarried ? { position: "absolute", visibility: "hidden" } : {}),
});

/** The look of a column's dot: waiting for someone, done, or just under way. */
export const dotOf = (column: Column): "neutral" | "warning" | "success" =>
  column.waits ? "warning" : column.id === "done" ? "success" : "neutral";

export function BoardColumn(props: {
  readonly column: Column;
  readonly count: number;
  readonly contentRef: (el: HTMLElement | null) => void;
  readonly isEmpty: boolean;
  readonly isWide: boolean;
  readonly width: number;
  readonly tip?: ReactNode;
  readonly children: ReactNode;
}) {
  const { column, count, contentRef, isEmpty, isWide, width, tip, children } = props;
  return (
    <Card variant="muted" padding={0} style={shellStyle(isWide, width)}>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={3}>
            <HStack hAlign="between" vAlign="center">
              <HStack gap={2} vAlign="center">
                <StatusDot variant={dotOf(column)} label={`${column.name} status`} />
                <Heading level={4} accessibilityLevel={2}>
                  {column.name}
                </Heading>
                {tip}
              </HStack>
              <Text type="supporting" color="secondary" hasTabularNumbers>
                {count}
              </Text>
            </HStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent ref={contentRef} padding={2}>
            {isEmpty ? (
              <EmptyState
                isCompact
                style={{ paddingBlock: "var(--spacing-10)" }}
                icon={<Icon icon={InboxIcon} size="lg" color="secondary" />}
                title={`${column.name} is empty`}
                description={column.tip}
              />
            ) : null}
            {children}
          </LayoutContent>
        }
      />
    </Card>
  );
}

/** The board's toolbar, the columns, and the card that follows the pointer. What each draws is passed in. */
export function Board(props: {
  readonly title: string;
  readonly count: number;
  readonly note?: string;
  readonly gap: 3 | 4;
  readonly drag: DragState | null;
  readonly floating: ReactNode;
  readonly children: (isWide: boolean) => ReactNode;
}) {
  const { title, count, note, gap, drag, floating, children } = props;
  const showToast = useToast();
  const isWide = useMediaQuery("(min-width: 768px)", true);
  const soon = (what: string) => () => showToast({ body: `${what} is not in this first set.`, uniqueID: what });
  return (
    <Section height="100%">
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={4}>
            <Toolbar
              label="Board actions"
              gap={2}
              startContent={
                <>
                  <Heading level={3} accessibilityLevel={1}>
                    {title}
                  </Heading>
                  <Badge label={count} variant="neutral" />
                  {note === undefined ? null : (
                    <Text type="supporting" color="secondary">
                      {note}
                    </Text>
                  )}
                </>
              }
              endContent={
                <HStack gap={2} wrap="wrap">
                  <Selector
                    label="View"
                    width={160}
                    isLabelHidden
                    value="Kanban"
                    onChange={(value) => {
                      if (value !== "Kanban") soon(`The ${value.toLowerCase()}`)();
                    }}
                    options={VIEWS}
                  />
                  <Divider
                    variant="strong"
                    orientation="vertical"
                    style={{ height: "auto", marginBlock: "var(--spacing-1)", alignSelf: "stretch" }}
                  />
                  <HStack gap={1} vAlign="center">
                    <IconButton icon={<Icon icon={ArrowsUpDownIcon} size="sm" />} label="Sort" onClick={soon("Sorting")} />
                    <IconButton icon={<Icon icon={FunnelIcon} size="sm" />} label="Filter" onClick={soon("Filtering")} />
                    <IconButton icon={<Icon icon={MagnifyingGlassIcon} size="sm" />} label="Search" onClick={soon("Search")} />
                  </HStack>
                  <Button
                    label="Add work"
                    variant="primary"
                    icon={<Icon icon={PlusIcon} size="sm" />}
                    onClick={soon("Adding work by hand")}
                  />
                </HStack>
              }
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent role="main" padding={0}>
            <HStack gap={gap} style={columnsStyle(isWide, gap)}>
              {children(isWide)}
            </HStack>
          </LayoutContent>
        }
      />
      {drag === null ? null : floating}
    </Section>
  );
}

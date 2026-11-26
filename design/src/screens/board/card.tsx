import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Layout, LayoutHeader, LayoutContent, HStack, VStack } from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { InfoTip } from "@astryxdesign/core/InfoTip";
import { go } from "../../shell";
import { COLUMNS, KIND_VARIANT, type ColumnId, type ColumnMeta, type Item } from "./data";
import { styles } from "./styles";

/** One task is drawn. */
const open = (id: string) => go(id === "ACME-412" ? "task" : `soon-${id}`);

/** What is on the card's last line: the thread on it now, or what moves it on. */
function Supporting({ item }: { item: Item }) {
  if (item.thread) {
    return (
      <HStack gap={2} vAlign="center">
        <StatusDot variant="success" label="Working" isPulsing />
        <Text type="supporting" color="secondary">A thread is working on it</Text>
      </HStack>
    );
  }
  if (item.next === "Nothing") return <Text type="supporting" color="secondary">Nothing left to do</Text>;
  return item.waits === "you"
    ? <Text type="supporting" weight="semibold">Next: {item.next}</Text>
    : <Text type="supporting" color="secondary">Next: {item.next}</Text>;
}

// Shared card contents, rendered both in the column list and inside the
// floating drag clone so the two stay pixel-identical.
export function BoardCardBody({ item, onMove }: { item: Item; onMove: (id: string, to: ColumnId) => void }) {
  const moveTargets = COLUMNS.filter((c) => c.id !== item.lane).map((c) => ({ label: `Move to ${c.title}`, onClick: () => onMove(item.id, c.id) }));
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="start">
        <HStack gap={1} vAlign="center" wrap="wrap">
          <Badge label={item.id} variant="neutral" />
          <Badge label={item.kind} variant={KIND_VARIANT[item.kind]} />
          {item.waits === "you" ? <Badge label="Waits for you" variant="warning" /> : null}
        </HStack>
        <MoreMenu
          label="Work actions"
          size="sm"
          items={[
            { label: "Open task", onClick: () => open(item.id) },
            ...(item.thread ? [{ label: "Open its thread", onClick: () => go(item.thread === "thread-46" ? "thread" : "soon-Thread") }] : []),
            { type: "divider" as const },
            ...moveTargets,
          ]}
        />
      </HStack>
      <VStack gap={1}>
        <Heading level={4} accessibilityLevel={3}>{item.title}</Heading>
        <Text type="supporting" color="secondary" maxLines={2}>{item.about}</Text>
      </VStack>
      <Supporting item={item} />
    </VStack>
  );
}

export function BoardCard({ item, cardRef, onPointerDown, onMove, isCarried = false }: {
  item: Item;
  cardRef: (el: HTMLDivElement | null) => void;
  onPointerDown: (e: ReactPointerEvent, id: string) => void;
  onMove: (id: string, to: ColumnId) => void;
  isCarried?: boolean;
}) {
  return (
    <Card
      ref={cardRef}
      padding={3}
      xstyle={[styles.card, isCarried && styles.carried]}
      onPointerDown={(e) => onPointerDown(e, item.id)}
      onClick={(e) => { if (!(e.target as HTMLElement).closest('button, [role="menuitem"], [role="menu"]')) open(item.id); }}>
      <BoardCardBody item={item} onMove={onMove} />
    </Card>
  );
}

export function BoardColumn({ meta, count, contentRef, isEmpty, children }: {
  meta: ColumnMeta; count: number; contentRef: (el: HTMLDivElement | null) => void; isEmpty: boolean; children: ReactNode;
}) {
  return (
    <Card variant="muted" padding={0} xstyle={styles.columnShell}>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={3}>
            <HStack hAlign="between" vAlign="center">
              <HStack gap={2} vAlign="center">
                <StatusDot variant={meta.variant} label={`${meta.title} status`} />
                <Heading level={4} accessibilityLevel={2}>{meta.title}</Heading>
                <InfoTip content={meta.tooltip} label={`About ${meta.title}`} />
              </HStack>
              <Text type="supporting" color="secondary" hasTabularNumbers>{count}</Text>
            </HStack>
          </LayoutHeader>
        }
        content={
          <LayoutContent ref={contentRef} padding={2}>
            {isEmpty ? (
              <EmptyState isCompact xstyle={styles.columnEmptyState} icon={<Icon icon={meta.emptyIcon} size="lg" color="secondary" />} title={meta.emptyTitle} description={meta.emptyDescription} />
            ) : null}
            {children}
          </LayoutContent>
        }
      />
    </Card>
  );
}

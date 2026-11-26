import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Layout, LayoutHeader, LayoutContent, HStack, VStack } from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { go } from "../../shell";
import { COLUMNS, type ColumnId, type ColumnMeta, type Item } from "./data";
import { styles } from "./styles";

/** No piece of Sales' work has a page of its own yet. */
const open = (id: string) => go(`soon-${id}`);

/** The card's last lines: who has it, and what it waits for. */
function Supporting({ item }: { item: Item }) {
  if (item.next === "Nothing") return <Text type="supporting" color="secondary">Closed by {item.who}</Text>;
  return (
    <VStack gap={1}>
      <Text type="supporting" weight={item.waits === "bo" ? "semibold" : "normal"} color={item.waits === "bo" ? "primary" : "secondary"}>Next: {item.next}</Text>
      {item.thread ? (
        <HStack gap={2} vAlign="center">
          <StatusDot variant="success" label="Working" isPulsing />
          <Text type="supporting" color="secondary">A thread is working on it</Text>
        </HStack>
      ) : <Text type="supporting" color="secondary">{item.waits === "customer" ? `Waits for the customer, ${item.who}` : `With ${item.who}`}</Text>}
    </VStack>
  );
}

// Shared card contents, rendered both in the column list and inside the
// floating drag clone so the two stay pixel-identical.
export function BoardCardBody({ item, onMove }: { item: Item; onMove: (id: string, to: ColumnId) => void }) {
  const moveTargets = COLUMNS.filter((c) => c.id !== item.step).map((c) => ({ label: `Move to ${c.title}`, onClick: () => onMove(item.id, c.id) }));
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="start">
        <HStack gap={1} vAlign="center" wrap="wrap">
          <Badge label={item.id} variant="neutral" />
          {item.waits === "bo" ? <Badge label="Waits for Bo" variant="warning" /> : null}
        </HStack>
        <MoreMenu
          label="Work actions"
          size="sm"
          items={[
            { label: "Open work", onClick: () => open(item.id) },
            ...(item.step === "yes" ? [{ label: "Open its question", onClick: () => go("m-sales-intake-i1") }] : []),
            { type: "divider" as const },
            ...moveTargets,
          ]}
        />
      </HStack>
      <VStack gap={1}>
        <Heading level={4} accessibilityLevel={3}>{item.company}</Heading>
        <Text type="supporting" color="secondary" maxLines={2}>{item.about}</Text>
        <Text type="supporting" color="secondary" maxLines={1}>{item.kind}</Text>
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

/** `count` is every piece of work in the step, drawn or not; `more` are the ones that are not drawn. */
export function BoardColumn({ meta, count, contentRef, isEmpty, onMore, children }: {
  meta: ColumnMeta; count: number; contentRef: (el: HTMLDivElement | null) => void; isEmpty: boolean; onMore: () => void; children: ReactNode;
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
            <VStack gap={2}>
              {children}
              {meta.more > 0 ? <Button label={`${meta.more} more${meta.id === "done" ? " this week" : ""}`} variant="ghost" size="sm" onClick={onMore} /> : null}
            </VStack>
          </LayoutContent>
        }
      />
    </Card>
  );
}

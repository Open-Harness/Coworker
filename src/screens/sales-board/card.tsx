// astryx-template: kanban-board
import type { PointerEvent as ReactPointerEvent } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useGo } from "~/modules/page/service.ts";
import type { BoardView, Card as BoardCard } from "~/modules/views-manager/types.ts";
import { cardStyle, type Column } from "../board-kit/layout.tsx";

interface Handlers {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerUp: () => void;
  readonly onPointerCancel: () => void;
}

/** The card's last lines: what moves it on, and who has it. */
function Supporting({ card, isWaiting }: { readonly card: BoardCard; readonly isWaiting: boolean }) {
  const { next } = card.work;
  if (next === null)
    return (
      <Text type="supporting" color="secondary">
        {card.says}
      </Text>
    );
  return (
    <VStack gap={1}>
      <Text type="supporting" weight={isWaiting ? "semibold" : "normal"} color={isWaiting ? "primary" : "secondary"}>
        {card.says}
      </Text>
      {card.thread !== null ? (
        <HStack gap={2} vAlign="center">
          <StatusDot variant="success" label="Working" isPulsing />
          <Text type="supporting" color="secondary">
            A thread is working on it
          </Text>
        </HStack>
      ) : (
        <Text type="supporting" color="secondary">
          {next.who === "outside" ? `Waits for the customer, ${card.who}` : `With ${card.who}`}
        </Text>
      )}
    </VStack>
  );
}

interface Common {
  readonly card: BoardCard;
  readonly manager: string;
  readonly columns: readonly Column[];
  /** The first name of who the work waits for, if it waits for a person. */
  readonly waits: string | null;
  readonly onMove: (id: string, to: string) => void;
}

/** Shared card contents, in the column and in the clone that follows the pointer, so the two stay identical. */
export function CardBody({ card, manager, columns, waits, onMove }: Common) {
  const go = useGo();
  const { work } = card;
  const column = columns.find((one) => one.id === work.step);
  const targets = columns
    .filter((one) => one.id !== work.step)
    .map((one) => ({ label: `Move to ${one.name}`, onClick: () => onMove(work.id, one.id) }));
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="start">
        <HStack gap={1} vAlign="center" wrap="wrap">
          <Badge label={work.id} variant="neutral" />
          {waits === null ? null : <Badge label={`Waits for ${waits}`} variant="warning" />}
        </HStack>
        <MoreMenu
          label="Work actions"
          size="sm"
          items={[
            { label: "Open work", onClick: () => go(`/m/${manager}/work/${work.id}`) },
            ...(column?.waits === true && waits !== null
              ? [{ label: "Open its question", onClick: () => go(`/m/${manager}/intake`) }]
              : []),
            { type: "divider" as const },
            ...targets,
          ]}
        />
      </HStack>
      <VStack gap={1}>
        <Heading level={4} accessibilityLevel={3}>
          {work.title}
        </Heading>
        <Text type="supporting" color="secondary" maxLines={2}>
          {work.about}
        </Text>
        <Text type="supporting" color="secondary" maxLines={1}>
          {card.kindName}
        </Text>
      </VStack>
      <Supporting card={card} isWaiting={waits !== null} />
    </VStack>
  );
}

export function BoardCardView(
  props: Common & {
    readonly cardRef: (el: HTMLElement | null) => void;
    readonly handlers: Handlers;
    readonly isCarried?: boolean;
  },
) {
  const { cardRef, handlers, isCarried = false, ...rest } = props;
  const go = useGo();
  return (
    <Card
      ref={cardRef}
      padding={3}
      style={cardStyle(isCarried)}
      {...handlers}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, [role="menuitem"], [role="menu"]') === null)
          go(`/m/${rest.manager}/work/${rest.card.work.id}`);
      }}
    >
      <CardBody {...rest} />
    </Card>
  );
}

export type { BoardView };

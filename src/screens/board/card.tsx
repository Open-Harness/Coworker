// astryx-template: kanban-board
import type { PointerEvent as ReactPointerEvent } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Card } from "@astryxdesign/core/Card";
import { Heading, Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { useGo } from "~/modules/page/service.ts";
import type { Card as BoardCard } from "~/modules/views-manager/types.ts";
import { cardStyle, type Column } from "../board-kit/layout.tsx";

interface Handlers {
  readonly onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerUp: () => void;
  readonly onPointerCancel: () => void;
}

/** What is on the card's last line: the thread on it now, or what moves it on. */
function Supporting({ card, isMine }: { readonly card: BoardCard; readonly isMine: boolean }) {
  if (card.thread !== null) {
    return (
      <HStack gap={2} vAlign="center">
        <StatusDot variant="success" label="Working" isPulsing />
        <Text type="supporting" color="secondary">
          {card.says}
        </Text>
      </HStack>
    );
  }
  return isMine ? (
    <Text type="supporting" weight="semibold">
      {card.says}
    </Text>
  ) : (
    <Text type="supporting" color="secondary">
      {card.says}
    </Text>
  );
}

/** Shared card contents, in the column and in the clone that follows the pointer, so the two stay identical. */
export function CardBody(props: {
  readonly card: BoardCard;
  readonly manager: string;
  readonly columns: readonly Column[];
  readonly me: string;
  readonly onMove: (id: string, to: string) => void;
}) {
  const { card, manager, columns, me, onMove } = props;
  const go = useGo();
  const { work } = card;
  const isMine = work.waits?.person === me;
  const targets = columns
    .filter((one) => one.id !== work.step)
    .map((one) => ({ label: `Move to ${one.name}`, onClick: () => onMove(work.id, one.id) }));
  return (
    <VStack gap={2}>
      <HStack hAlign="between" vAlign="start">
        <HStack gap={1} vAlign="center" wrap="wrap">
          <Badge label={work.id} variant="neutral" />
          <Badge label={card.kindName} variant="neutral" />
          {isMine ? <Badge label="Waits for you" variant="warning" /> : null}
        </HStack>
        <MoreMenu
          label="Work actions"
          size="sm"
          items={[
            { label: "Open task", onClick: () => go(`/m/${manager}/work/${work.id}`) },
            ...(card.thread === null ? [] : [{ label: "Open its thread", onClick: () => go(`/m/${manager}/threads/${card.thread}`) }]),
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
      </VStack>
      <Supporting card={card} isMine={isMine} />
    </VStack>
  );
}

export function BoardCardView(props: {
  readonly card: BoardCard;
  readonly manager: string;
  readonly columns: readonly Column[];
  readonly me: string;
  readonly cardRef: (el: HTMLElement | null) => void;
  readonly handlers: Handlers;
  readonly onMove: (id: string, to: string) => void;
  readonly isCarried?: boolean;
}) {
  const { card, manager, cardRef, handlers, isCarried = false, ...rest } = props;
  const go = useGo();
  return (
    <Card
      ref={cardRef}
      padding={3}
      style={cardStyle(isCarried)}
      {...handlers}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, [role="menuitem"], [role="menu"]') === null)
          go(`/m/${manager}/work/${card.work.id}`);
      }}
    >
      <CardBody card={card} manager={manager} {...rest} />
    </Card>
  );
}

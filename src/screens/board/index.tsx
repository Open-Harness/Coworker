// astryx-template: kanban-board
import { useMemo, type ReactNode } from "react";
import { Card } from "@astryxdesign/core/Card";
import { InfoTip } from "@astryxdesign/core/InfoTip";
import { VStack } from "@astryxdesign/core/Layout";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack } from "@astryxdesign/core/Layout";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useApi, useBrowser, useRead, useRefresh } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { BoardView, Card as BoardCardData } from "~/modules/views-manager/types.ts";
import { Board, BoardColumn, ghostStyle, floatingStyle } from "../board-kit/layout.tsx";
import { useBoardDrag } from "../board-kit/drag.ts";
import { ManagerFrame } from "../manager-frame/frame.tsx";
import { BoardCardView, CardBody } from "./card.tsx";

/** A board that is still being read does not know its steps yet: five columns of unnamed shapes, one on a phone. */
const SHAPES = [0, 1, 2, 3, 4] as const;

function Waiting() {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  return (
    <HStack gap={3} padding={4} vAlign="start">
      {SHAPES.slice(0, isNarrow ? 1 : SHAPES.length).map((column) => (
        <VStack key={column} gap={3} style={{ flex: 1, minWidth: 0 }}>
          <Skeleton width="50%" height={16} />
          {[0, 1].map((i) => (
            <Card key={i} padding={3}>
              <VStack gap={2}>
                <Skeleton width="40%" height={12} />
                <Skeleton width="90%" height={14} />
                <Skeleton width="70%" height={12} />
              </VStack>
            </Card>
          ))}
        </VStack>
      ))}
    </HStack>
  );
}

/** The work of one manager in the steps its process decided. A card is dragged, or moved from its menu. */
function Work({ view, manager }: { readonly view: BoardView; readonly manager: string }) {
  const showToast = useToast();
  const [api, refresh, { newId }, shell] = [useApi(), useRefresh(), useBrowser(), useRead("/shell")];
  const me = shell._tag === "Ok" ? shell.value.me.id : "";
  const names = useMemo(() => view.columns.map((one) => one.id), [view.columns]);
  const nameOf = (id: string): string => view.columns.find((one) => one.id === id)?.name ?? id;
  const landed = async (card: BoardCardData, to: string, before: string | null) => {
    const moved =
      card.work.step === to
        ? undefined
        : await api.write("/do", { doing: "work.move", values: { manager, work: card.work.id, step: to }, key: newId() });
    const placed = await api.write("/do", {
      doing: "work.order",
      values: { manager, work: card.work.id, ...(before === null ? {} : { before }) },
      key: newId(),
    });
    const failed = [moved, placed].find((one) => one !== undefined && one._tag !== "Ok");
    if (failed?._tag === "Problem")
      return showToast({ body: `That did not go through. ${failed.says}`, uniqueID: `failed-${card.work.id}` });
    if (card.work.step !== to)
      showToast({
        body: `${view.head.name} is told: ${card.work.id} moved from ${nameOf(card.work.step)} to ${nameOf(to)}.`,
        uniqueID: `moved-${card.work.id}`,
      });
    refresh();
  };
  const { items, itemsByColumn, drag, moveItem, getColumnRef, getCardRef, cardHandlers, isColumnEmpty } = useBoardDrag(
    view.cards,
    names,
    (card, to, before) => void landed(card, to, before),
  );
  const dragged = drag === null ? undefined : items.find((one) => one.work.id === drag.id);
  const columnCards = (id: string, isWide: boolean): ReactNode => {
    const here = itemsByColumn[id] ?? [];
    const visible = drag === null ? here : here.filter((one) => one.work.id !== drag.id);
    const carried = drag === null ? undefined : here.find((one) => one.work.id === drag.id);
    const ghost = drag?.target?.column === id ? drag : null;
    if (visible.length === 0 && ghost === null && carried === undefined) return null;
    const draw = (one: BoardCardData, isCarried = false) => (
      <BoardCardView
        key={one.work.id}
        card={one}
        manager={manager}
        columns={view.columns}
        me={me}
        cardRef={getCardRef(one.work.id)}
        handlers={cardHandlers(one.work.id)}
        onMove={moveItem}
        isCarried={isCarried}
      />
    );
    const nodes: ReactNode[] = visible.map((one) => draw(one));
    if (ghost?.target)
      nodes.splice(Math.min(ghost.target.index, nodes.length), 0, <VStack key="drag-ghost" style={ghostStyle(ghost.height)} />);
    if (carried) nodes.push(draw(carried, true));
    void isWide;
    return (
      <VStack gap={2} style={{ position: "relative" }}>
        {nodes}
      </VStack>
    );
  };
  return (
    <Board
      title="Work"
      count={items.length}
      gap={4}
      drag={drag}
      floating={
        dragged === undefined || drag === null ? null : (
          <Card padding={3} style={floatingStyle(drag)}>
            <CardBody card={dragged} manager={manager} columns={view.columns} me={me} onMove={() => undefined} />
          </Card>
        )
      }
    >
      {(isWide) =>
        view.columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            count={(itemsByColumn[column.id] ?? []).length}
            contentRef={getColumnRef(column.id)}
            isEmpty={isColumnEmpty(column.id)}
            isWide={isWide}
            width={220}
            tip={<InfoTip content={column.tip} label={`About ${column.name}`} />}
          >
            {columnCards(column.id, isWide)}
          </BoardColumn>
        ))
      }
    </Board>
  );
}

export default function BoardPage({ params }: PageProps) {
  const manager = params["manager"] ?? "";
  return (
    <ManagerFrame id={manager} tab="Board">
      <Reading
        from="/m/:manager/board"
        parts={params}
        loading={<Waiting />}
        failed="We could not read the board"
        gone={{ title: "This manager is not here" }}
      >
        {(view) => <Work view={view} manager={manager} />}
      </Reading>
    </ManagerFrame>
  );
}

// astryx-template: kanban-board
import { useMemo, type ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Layout";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useApi, useBrowser, useRead, useRefresh } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { BoardView, Card as BoardCardData } from "~/modules/views-manager/types.ts";
import { useBoardDrag } from "../board-kit/drag.ts";
import { Board, BoardColumn, floatingStyle, ghostStyle } from "../board-kit/layout.tsx";
import { ManagerFrame } from "../manager-frame/frame.tsx";
import { BoardCardView, CardBody } from "./card.tsx";

/** A manager's board where its own steps are the columns, and the work waits for customers. The manager's name and tabs are above it. */
function Work({ view, manager }: { readonly view: BoardView; readonly manager: string }) {
  const showToast = useToast();
  const [api, refresh, { newId }, shell] = [useApi(), useRefresh(), useBrowser(), useRead("/shell")];
  const people = shell._tag === "Ok" ? shell.value.people : [];
  const first = (id: string): string => people.find((one) => one.id === id)?.name.split(" ")[0] ?? id;
  const waitsOf = (card: BoardCardData): string | null => (card.work.waits === null ? null : first(card.work.waits.person));
  const names = useMemo(() => view.columns.map((one) => one.id), [view.columns]);
  const nameOf = (id: string): string => view.columns.find((one) => one.id === id)?.name ?? id;
  const soon = (what: string) => () => showToast({ body: `${what} is not in this first set.`, uniqueID: what });
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
  const waiting = items.find((one) => one.work.waits !== null);
  const note = [
    `${view.totals.outside} ${view.totals.outside === 1 ? "waits" : "wait"} for the customer`,
    ...(view.totals.person > 0
      ? [`${view.totals.person} waits for ${waiting === undefined ? "a person" : (waitsOf(waiting) ?? "a person")}`]
      : []),
  ].join(", ");
  const columnCards = (id: string): ReactNode => {
    const here = itemsByColumn[id] ?? [];
    const visible = drag === null ? here : here.filter((one) => one.work.id !== drag.id);
    const carried = drag === null ? undefined : here.find((one) => one.work.id === drag.id);
    const ghost = drag?.target?.column === id ? drag : null;
    const draw = (one: BoardCardData, isCarried = false) => (
      <BoardCardView
        key={one.work.id}
        card={one}
        manager={manager}
        columns={view.columns}
        waits={waitsOf(one)}
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
    return nodes;
  };
  return (
    <Board
      title="Open work"
      count={view.totals.open}
      note={note}
      gap={3}
      drag={drag}
      floating={
        dragged === undefined || drag === null ? null : (
          <Card padding={3} style={floatingStyle(drag)}>
            <CardBody card={dragged} manager={manager} columns={view.columns} waits={waitsOf(dragged)} onMove={() => undefined} />
          </Card>
        )
      }
    >
      {(isWide) =>
        view.columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            count={(itemsByColumn[column.id] ?? []).length + column.more}
            contentRef={getColumnRef(column.id)}
            isEmpty={isColumnEmpty(column.id) && column.more === 0}
            isWide={isWide}
            width={176}
          >
            <VStack gap={2} style={{ position: "relative" }}>
              {columnCards(column.id)}
              {column.more > 0 ? (
                <Button
                  label={`${column.more} more${column.id === "done" ? " this week" : ""}`}
                  variant="ghost"
                  size="sm"
                  onClick={soon("The list")}
                />
              ) : null}
            </VStack>
          </BoardColumn>
        ))
      }
    </Board>
  );
}

/** The route names its manager, so no part of the path does. */
const MANAGER = "sales";

export default function SalesBoardPage(_: PageProps) {
  const manager = MANAGER;
  return (
    <ManagerFrame id={manager} tab="Board">
      <Reading
        from="/m/:manager/board"
        parts={{ manager }}
        failed="We could not read the board"
        gone={{ title: "This manager is not here" }}
      >
        {(view) => <Work view={view} manager={manager} />}
      </Reading>
    </ManagerFrame>
  );
}

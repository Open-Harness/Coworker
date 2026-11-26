import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Card } from "~/modules/views-manager/types.ts";

/** Pointer travel (px) before a press is promoted to a drag, so taps and clicks on card controls still register. */
const THRESHOLD = 5;
const CONTROLS = 'button, [role="menuitem"], [role="menu"]';

/** Where a dragged card will land: a column, and the place in it among the cards that stay. */
interface DropTarget {
  readonly column: string;
  readonly index: number;
}
/** A drag in progress. Coordinates are the viewport's. */
export interface DragState {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly pointerX: number;
  readonly pointerY: number;
  readonly target: DropTarget | null;
}
interface Press {
  readonly id: string;
  readonly startX: number;
  readonly startY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
  started: boolean;
  target: DropTarget | null;
}

/**
 * The board's cards, and the pointer drag that moves them. The pointer is captured by the card itself, so nothing listens on the
 * window. `onLanded` runs when a card is put somewhere: its new step, and the card it now comes before.
 */
export function useBoardDrag(
  cards: readonly Card[],
  columns: readonly string[],
  onLanded: (card: Card, to: string, before: string | null) => void,
) {
  const [items, setItems] = useState<readonly Card[]>(cards);
  const [drag, setDrag] = useState<DragState | null>(null);
  const columnEls = useRef(new Map<string, HTMLElement>());
  const cardEls = useRef(new Map<string, HTMLElement>());
  const press = useRef<Press | null>(null);
  useEffect(() => setItems(cards), [cards]);

  const itemsByColumn = useMemo(
    () => Object.fromEntries(columns.map((id) => [id, items.filter((one) => one.work.step === id)])) as Record<string, readonly Card[]>,
    [items, columns],
  );
  const put = (one: Card, step: string): Card => ({ ...one, work: { ...one.work, step } });

  const moveItem = (id: string, to: string) => {
    const card = items.find((one) => one.work.id === id);
    if (card === undefined || card.work.step === to) return;
    setItems((was) => was.map((one) => (one.work.id === id ? put(one, to) : one)));
    onLanded(card, to, null);
  };

  /** The column under the pointer, and the place among the cards that would stay if this one left. */
  const targetAt = (x: number, y: number, id: string): DropTarget | null => {
    for (const [column, el] of columnEls.current) {
      const box = el.getBoundingClientRect();
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue;
      const rest = (itemsByColumn[column] ?? []).filter((one) => one.work.id !== id);
      const above = rest.findIndex((one) => {
        const at = cardEls.current.get(one.work.id)?.getBoundingClientRect();
        return at !== undefined && y < at.top + at.height / 2;
      });
      return { column, index: above < 0 ? rest.length : above };
    }
    return null;
  };

  const land = (id: string, target: DropTarget) => {
    const card = items.find((one) => one.work.id === id);
    if (card === undefined) return;
    const rest = items.filter((one) => one.work.id !== id);
    const anchor = rest.filter((one) => one.work.step === target.column)[target.index];
    const updated = put(card, target.column);
    setItems(
      anchor === undefined ? [...rest, updated] : [...rest.slice(0, rest.indexOf(anchor)), updated, ...rest.slice(rest.indexOf(anchor))],
    );
    onLanded(card, target.column, anchor?.work.id ?? null);
  };

  const onCardPointerDown = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    // A finger scrolls the board; its cards move from the actions menu.
    if (e.button !== 0 || e.pointerType === "touch" || (e.target as HTMLElement).closest(CONTROLS) !== null) return;
    const box = e.currentTarget.getBoundingClientRect();
    press.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - box.left,
      offsetY: e.clientY - box.top,
      width: box.width,
      height: box.height,
      started: false,
      target: null,
    };
  };
  const onCardPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const now = press.current;
    if (now === null) return;
    if (!now.started && Math.abs(e.clientX - now.startX) + Math.abs(e.clientY - now.startY) < THRESHOLD) return;
    if (!now.started) e.currentTarget.setPointerCapture(e.pointerId);
    now.started = true;
    now.target = targetAt(e.clientX, e.clientY, now.id);
    setDrag({ ...now, pointerX: e.clientX, pointerY: e.clientY });
  };
  const onCardPointerUp = () => {
    const now = press.current;
    press.current = null;
    if (now?.started === true && now.target !== null) land(now.id, now.target);
    setDrag(null);
  };
  const onCardPointerCancel = () => {
    press.current = null;
    setDrag(null);
  };

  const registerIn = (map: React.MutableRefObject<Map<string, HTMLElement>>, id: string) => (el: HTMLElement | null) => {
    if (el === null) map.current.delete(id);
    else map.current.set(id, el);
  };
  return {
    items,
    itemsByColumn,
    drag,
    moveItem,
    getColumnRef: (id: string) => registerIn(columnEls, id),
    getCardRef: (id: string) => registerIn(cardEls, id),
    cardHandlers: (id: string) => ({
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => onCardPointerDown(e, id),
      onPointerMove: onCardPointerMove,
      onPointerUp: onCardPointerUp,
      onPointerCancel: onCardPointerCancel,
    }),
    isColumnEmpty: (id: string): boolean =>
      !(itemsByColumn[id] ?? []).some((one) => one.work.id !== drag?.id) && drag?.target?.column !== id,
  };
}

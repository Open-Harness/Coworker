import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useLongPress } from "@astryxdesign/core/hooks";
import { COLUMNS, DRAG_THRESHOLD, ITEMS, type ColumnId, type Item } from "./data";

// Where a dragged card will land: a column and an insertion index within it
// (measured against the cards remaining after the dragged card is removed).
interface DropTarget { column: ColumnId; index: number }

// Live state of an in-progress pointer drag. Coordinates are in viewport space.
export interface DragState {
  id: string; width: number; height: number; offsetX: number; offsetY: number; pointerX: number; pointerY: number; target: DropTarget | null;
}

/** The board's cards and the pointer drag that moves them. `onMoved` runs when a card lands in another lane. */
export function useBoardDrag(onMoved: (item: Item, to: ColumnId) => void) {
  const [items, setItems] = useState<Item[]>(ITEMS);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Live element registries for pointer hit-testing (kept out of render state).
  const columnEls = useRef(new Map<ColumnId, HTMLElement>());
  const cardEls = useRef(new Map<string, HTMLElement>());
  const columnRefCbs = useRef(new Map<ColumnId, (el: HTMLDivElement | null) => void>());
  const cardRefCbs = useRef(new Map<string, (el: HTMLDivElement | null) => void>());
  const teardownRef = useRef<(() => void) | null>(null);
  // True while a finger or pen carries a card: the card's touch moves then
  // carry it and must not scroll the board.
  const carryingRef = useRef(false);
  // A finger lifts a card with a long press, so a swipe that starts on a
  // card still scrolls the board.
  const liftRef = useRef<(() => void) | null>(null);
  const longPress = useLongPress({ onLongPress: () => liftRef.current?.() });

  // Stable ref callbacks so registering an element never churns across renders.
  const getColumnRef = (id: ColumnId) => {
    let cb = columnRefCbs.current.get(id);
    if (!cb) {
      cb = (el) => { if (el) columnEls.current.set(id, el); else columnEls.current.delete(id); };
      columnRefCbs.current.set(id, cb);
    }
    return cb;
  };

  const holdScroll = useRef((ev: TouchEvent) => { if (carryingRef.current) ev.preventDefault(); }).current;

  const getCardRef = (id: string) => {
    let cb = cardRefCbs.current.get(id);
    if (!cb) {
      cb = (el) => {
        cardEls.current.get(id)?.removeEventListener("touchmove", holdScroll);
        if (el) {
          cardEls.current.set(id, el);
          // A touch's moves go to the element it started on, so the hold
          // lives on each card. It must not be passive to cancel the scroll.
          el.addEventListener("touchmove", holdScroll, { passive: false });
        } else cardEls.current.delete(id);
      };
      cardRefCbs.current.set(id, cb);
    }
    return cb;
  };

  const itemsByColumn = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as Item[]])) as Record<ColumnId, Item[]>;
    for (const item of items) map[item.step].push(item);
    return map;
  }, [items]);

  const moveItem = (id: string, to: ColumnId) => {
    const item = items.find((it) => it.id === id);
    if (!item || item.step === to) return;
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, step: to } : it)));
    onMoved(item, to);
  };

  // Resolve the pointer position to a column + insertion index, ignoring the
  // card being dragged so the math is against the cards that stay in place.
  const computeTarget = (px: number, py: number, draggedId: string): DropTarget | null => {
    for (const [colId, el] of Array.from(columnEls.current.entries())) {
      const r = el.getBoundingClientRect();
      if (px < r.left || px > r.right || py < r.top || py > r.bottom) continue;
      const ids = itemsByColumn[colId].filter((it) => it.id !== draggedId).map((it) => it.id);
      let index = ids.length;
      for (let i = 0; i < ids.length; i++) {
        const cardEl = cardEls.current.get(ids[i]!);
        if (!cardEl) continue;
        const cr = cardEl.getBoundingClientRect();
        if (py < cr.top + cr.height / 2) { index = i; break; }
      }
      return { column: colId, index };
    }
    return null;
  };

  // Rebuild the flat item list so the dragged card lands at the resolved slot
  // while every other card keeps its relative order.
  const commitDrag = (id: string, target: DropTarget) => {
    const before = items.find((it) => it.id === id);
    setItems((prev) => {
      const moved = prev.find((it) => it.id === id);
      if (!moved) return prev;
      const rest = prev.filter((it) => it.id !== id);
      const updated: Item = { ...moved, step: target.column };
      const anchor = rest.filter((it) => it.step === target.column)[target.index];
      if (!anchor) return [...rest, updated];
      const at = rest.indexOf(anchor);
      return [...rest.slice(0, at), updated, ...rest.slice(at)];
    });
    if (before && before.step !== target.column) onMoved(before, target.column);
  };

  const onCardPointerDown = (e: ReactPointerEvent, id: string) => {
    if (e.button !== 0) return;
    // Let the card's own controls (the actions menu) handle the press.
    if ((e.target as HTMLElement).closest('button, [role="menuitem"], [role="menu"]')) return;
    const el = cardEls.current.get(id);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;
    const { width, height } = rect;

    let started = false;
    let target: DropTarget | null = null;
    const byLongPress = e.pointerType === "touch";

    const follow = (x: number, y: number) => {
      started = true;
      carryingRef.current = e.pointerType !== "mouse";
      target = computeTarget(x, y, id);
      setDrag({ id, width, height, offsetX, offsetY, pointerX: x, pointerY: y, target });
    };

    if (byLongPress) {
      liftRef.current = () => follow(startX, startY);
      longPress.start({ x: startX, y: startY });
    }

    const onMove = (ev: PointerEvent) => {
      if (!started && byLongPress) {
        // The finger moved before the long press: it is a scroll.
        if (!longPress.moveTo({ x: ev.clientX, y: ev.clientY })) teardownRef.current?.();
        return;
      }
      if (!started && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) return;
      follow(ev.clientX, ev.clientY);
    };
    const onCancel = () => { teardownRef.current?.(); setDrag(null); };
    const onUp = () => {
      teardownRef.current?.();
      if (started && target) commitDrag(id, target);
      setDrag(null);
    };
    const teardown = () => {
      longPress.cancel();
      liftRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      carryingRef.current = false;
      teardownRef.current = null;
    };
    teardownRef.current = teardown;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const isDragging = drag !== null;
  // Suppress selection while dragging and detach listeners on unmount.
  useEffect(() => {
    if (!isDragging) return;
    const previous = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => { document.body.style.userSelect = previous; };
  }, [isDragging]);
  useEffect(() => () => teardownRef.current?.(), []);

  const isColumnEmpty = (colId: ColumnId): boolean =>
    !itemsByColumn[colId].some((it) => it.id !== drag?.id) && drag?.target?.column !== colId;

  return { items, itemsByColumn, drag, moveItem, getColumnRef, getCardRef, onCardPointerDown, isColumnEmpty };
}

import { useCallback, useMemo, type KeyboardEvent } from "react";
import type { TablePlugin } from "@astryxdesign/core/Table";
import type { Row } from "./rows.ts";

interface TreeKeyboardNavConfig {
  /** The flattened, currently visible rows, in render order. */
  rows: ReadonlyArray<Row>;
  focusedId: string | null;
  onFocusedIdChange: (id: string) => void;
  expandedIds: ReadonlySet<string>;
  onExpand: (id: string) => void;
  onCollapse: (id: string) => void;
  onOpen: (id: string) => void;
}

/**
 * Treegrid keys over the visible rows: Up/Down move, Right expands then descends, Left collapses then ascends, Home/End
 * jump to the ends, Enter opens the manager. The table is one tab stop (roving tabindex); focus itself is moved by the
 * page, so a click and a keypress converge on one path.
 */
export function useTreeKeyboardNav({
  rows,
  focusedId,
  onFocusedIdChange,
  expandedIds,
  onExpand,
  onCollapse,
  onOpen,
}: TreeKeyboardNavConfig): TablePlugin<Row> {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTableElement>) => {
      if (event.defaultPrevented || rows.length === 0) return;
      const index = rows.findIndex((row) => row.id === focusedId);
      const current = index >= 0 ? rows[index] : undefined;
      const hasChildren = Boolean(current?.children?.length);
      const isExpanded = current != null && expandedIds.has(current.id);
      let nextId: string | undefined;
      switch (event.key) {
        case "ArrowDown":
          nextId = rows[index + 1]?.id ?? rows[0]?.id;
          break;
        case "ArrowUp":
          nextId = index > 0 ? rows[index - 1]?.id : rows[0]?.id;
          break;
        case "ArrowRight":
          if (current == null) nextId = rows[0]?.id;
          else if (hasChildren && !isExpanded) onExpand(current.id);
          else if (hasChildren) nextId = rows[index + 1]?.id;
          break;
        case "ArrowLeft":
          if (current == null) nextId = rows[0]?.id;
          else if (hasChildren && isExpanded) onCollapse(current.id);
          else nextId = rows.find((row) => row.id === current.parentId)?.id;
          break;
        case "Home":
          nextId = rows[0]?.id;
          break;
        case "End":
          nextId = rows[rows.length - 1]?.id;
          break;
        case "Enter":
          if (current != null) onOpen(current.id);
          break;
        default:
          return;
      }
      // Every branch above either moved focus or toggled a row, so the key must not also scroll the page.
      event.preventDefault();
      if (nextId != null && nextId !== focusedId) onFocusedIdChange(nextId);
    },
    [rows, focusedId, expandedIds, onExpand, onCollapse, onFocusedIdChange, onOpen],
  );

  return useMemo(
    () => ({
      transformTable: (props) => ({ ...props, htmlProps: { ...props.htmlProps, onKeyDown: handleKeyDown } }),
      transformBodyRow: (props, item) => ({
        ...props,
        htmlProps: {
          ...props.htmlProps,
          tabIndex: item.id === focusedId ? 0 : -1,
          "data-row-id": item.id,
          onClick: () => onFocusedIdChange(item.id),
        },
      }),
    }),
    [handleKeyDown, focusedId, onFocusedIdChange],
  );
}

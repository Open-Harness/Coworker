import { useMemo } from "react";
import { pixel } from "@astryxdesign/core/Table";
import type { TablePlugin } from "@astryxdesign/core/Table";
import type { Item } from "./data";

/** Matches the wash the selection plugin paints, so the open row looks native. */
const OPEN_CELL_STYLE = { backgroundColor: "var(--color-accent-muted)" };

/** Room for "Yesterday" in the time column, plus the cell's own 12px on each side. */
export const TIME_WIDTH = 76 + 24;

/** The status gutter's width, so the dot lands on the content line. */
const STATUS_GUTTER_WIDTH = 36;
const STATUS_COLUMN_KEY = "__rowStatus";
export const ALIGN_STATUS_GUTTER: TablePlugin<Item> = {
  transformColumns: (columns) => columns.map((column) => (column.key === STATUS_COLUMN_KEY ? { ...column, width: pixel(STATUS_GUTTER_WIDTH) } : column)),
};

/** Row behaviour: the row is the control surface. Click, Enter and Space open it. */
export function useInboxRows({ openId, onOpen }: { openId: string | null; onOpen: (item: Item) => void }): TablePlugin<Item> {
  return useMemo(() => ({
    transformBodyRow: (props, item) => ({
      ...props,
      htmlProps: {
        ...props.htmlProps,
        tabIndex: 0,
        "aria-current": item.id === openId ? true : undefined,
        onClick: () => onOpen(item),
        onKeyDown: (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onOpen(item);
        },
      },
    }),
    transformBodyCell: (props, _column, item) => (item.id === openId ? { ...props, htmlProps: { ...props.htmlProps, style: { ...props.htmlProps.style, ...OPEN_CELL_STYLE } } } : props),
  }), [onOpen, openId]);
}

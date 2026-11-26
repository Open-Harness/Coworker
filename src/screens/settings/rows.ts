// astryx-template: table
import { useMemo } from "react";
import type { TablePlugin } from "@astryxdesign/core/Table";

const INSIDE = 'button, input, a, label, [role="button"], [role="menuitem"], [role="radio"]';
const OPEN_CELL = { backgroundColor: "var(--color-accent-muted)" };
const isInside = (target: EventTarget): boolean => target instanceof Element && target.closest(INSIDE) !== null;

/** A table whose rows open a record beside it: click, Enter and Space open it, the open one is tinted. */
export function useOpenRow<T extends { id: string }>(openId: string | null, onOpen: (item: T) => void): TablePlugin<T> {
  return useMemo(
    () => ({
      transformBodyRow: (props, item) => ({
        ...props,
        htmlProps: {
          ...props.htmlProps,
          tabIndex: 0,
          "aria-current": item.id === openId ? true : undefined,
          onClick: (e) => {
            if (!isInside(e.target)) onOpen(item);
          },
          onKeyDown: (e) => {
            if ((e.key === "Enter" || e.key === " ") && !isInside(e.target)) {
              e.preventDefault();
              onOpen(item);
            }
          },
        },
      }),
      transformBodyCell: (props, _c, item) =>
        item.id === openId ? { ...props, htmlProps: { ...props.htmlProps, style: { ...props.htmlProps.style, ...OPEN_CELL } } } : props,
    }),
    [openId, onOpen],
  );
}

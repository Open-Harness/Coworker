import { useLayoutEffect, useRef, useState } from "react";

/** Below this the surface cannot hold a list and a pane side by side, so the pane takes all of it and the list comes back when it closes. */
export const SINGLE_SURFACE_BELOW = 900;
/** Below this much room for the table, the columns stop earning their keep and the rows stack. */
export const STACK_ROWS_BELOW = 560;
/** Below this much room for the table, the tags column goes. */
export const TIGHTEN_COLUMNS_BELOW = 900;
/** What the pane is worth on arrival: two thirds, leaving the list a third. */
export const PANE_DEFAULT_SHARE = 2 / 3;
/** The narrowest the list may be dragged: the pane's ceiling is the surface less this. */
export const LIST_MIN_WIDTH = 300;
/** The narrowest the pane may be dragged. */
export const PANE_MIN_WIDTH = 440;
/** The tab strip's height, borrowed by the bulk-selection bar that replaces it so selecting a row does not move the table. */
export const SELECTION_BAR_HEIGHT = 37;
/** How wide a message may get, whatever the pane: the prose keeps a readable measure. */
export const MESSAGE_MEASURE = 680;

/**
 * The width of the box this screen was given, tracked as it changes. Every responsive decision is about that box, not the window.
 * The first read is synchronous and before paint; `offsetWidth` is the laid-out width, as a ResizeObserver reports it.
 */
export function useSurfaceWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const { paddingInlineStart, paddingInlineEnd } = getComputedStyle(node);
    setWidth(node.offsetWidth - parseFloat(paddingInlineStart) - parseFloat(paddingInlineEnd));
    const observer = new ResizeObserver((entries) => { const entry = entries[0]; if (entry) setWidth(entry.contentRect.width); });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

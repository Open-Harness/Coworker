import { useLayoutEffect, useRef, useState } from "react";

/** Below this width the split pane collapses to a single chat column. */
export const MOBILE_MAX_WIDTH = 767;

/** The width of the box this page was given, tracked as it changes: what is wide enough for a panel beside the chat is a question about it. */
export function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    setWidth(node.offsetWidth);
    const observer = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? 0));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

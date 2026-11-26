import { useLayoutEffect, useState, type RefObject } from "react";

/** Reports the observed width of whatever the ref is attached to; null until measured, so the first paint is not a guess. */
export function useMeasuredWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element == null) return;
    const observer = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? null));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

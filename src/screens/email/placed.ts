import { useCallback, useLayoutEffect, useRef } from "react";
import { useResizable } from "@astryxdesign/core/Resizable";
import { LIST_MIN_WIDTH, PANE_DEFAULT_SHARE, PANE_MIN_WIDTH } from "./surface.ts";

/** The pane beside the list, on its share of the surface, and kept there until the handle is used. */
export function usePlacedPane(surfaceWidth: number) {
  const isMeasured = surfaceWidth > 0;
  const hasUserMovedPane = useRef(false);
  const isPlacingPane = useRef(false);
  const onPaneSizeChange = useCallback(() => {
    if (!isPlacingPane.current) hasUserMovedPane.current = true;
  }, []);
  const pane = useResizable({
    defaultSize: "58%",
    minSize: PANE_MIN_WIDTH,
    ...(isMeasured ? { maxSize: Math.max(PANE_MIN_WIDTH, surfaceWidth - LIST_MIN_WIDTH) } : {}),
    onSizeChange: onPaneSizeChange,
  });
  const { resize: resizePane } = pane;
  useLayoutEffect(() => {
    if (hasUserMovedPane.current || !isMeasured) return;
    isPlacingPane.current = true;
    resizePane(Math.round(surfaceWidth * PANE_DEFAULT_SHARE));
    isPlacingPane.current = false;
  }, [isMeasured, surfaceWidth, resizePane]);
  return pane;
}

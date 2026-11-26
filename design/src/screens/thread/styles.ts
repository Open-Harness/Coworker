import type { CSSProperties } from "react";

// Below this width the split-pane collapses to a single chat column. Shared by
// the CSS container query and the JS check in openPanel so they can't drift.
export const MOBILE_MAX_WIDTH = 767;

export const root: CSSProperties = { height: "100%", width: "100%", containerType: "inline-size", containerName: "artifact" };
export const chatColumn: CSSProperties = { flex: 1, width: "100%", minWidth: 0, height: "100%" };
export const chatLayout: CSSProperties = { flex: 1, minHeight: 0 };
export const artifactScroll: CSSProperties = { flex: 1, overflowY: "auto" };

// Runtime width for the panel, passed in via the --artifact-panel-width
// custom property so the MOBILE container query can still override it to 100%
// (an inline `width` would beat the class rule).
export const panelWidthVar = (size: number | string): CSSProperties =>
  ({ "--artifact-panel-width": typeof size === "number" ? `${size}px` : size }) as CSSProperties;

export const CSS = `
.ai-chat-resize-handle {
  display: flex;
}
/* The scrollbar ends where the handle's grab zone begins, so the zone
   never covers it. */
.ai-chat-column-beside-handle {
  padding-inline-end: var(--spacing-2);
}
.ai-chat-artifact-panel {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: var(--artifact-panel-width);
  flex-shrink: 0;
}
@container artifact (max-width: ${MOBILE_MAX_WIDTH}px) {
  .ai-chat-resize-handle {
    display: none;
  }
  .ai-chat-column-beside-handle {
    padding-inline-end: 0;
  }
  .ai-chat-artifact-panel {
    display: none;
    width: 100%;
    flex-shrink: 1;
  }
}
`;

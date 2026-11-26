import type { CSSProperties } from "react";
export const styles: Record<"contentFill" | "searchRow" | "groupHeader" | "rows" | "inspector", CSSProperties> = {
  contentFill: { height: "100%", minHeight: 0 },
  searchRow: { padding: "var(--spacing-3)" },
  groupHeader: { padding: "var(--spacing-2) var(--spacing-3)", backgroundColor: "var(--color-background-muted)" },
  rows: { overflowY: "auto", minHeight: 0 },
  inspector: { padding: "var(--spacing-4)", height: "100%", overflowY: "auto" },
};

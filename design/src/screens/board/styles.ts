import * as stylex from "@stylexjs/stylex";
// Shared width for every board column. Below 768px the lanes stack top to bottom at full width, so a phone shows whole lanes.
const COLUMN_WIDTH = 220;
const SIDE_BY_SIDE = "@media (min-width: 768px)";

export const styles = stylex.create({
  boardColumns: {
    flexDirection: { default: "column", [SIDE_BY_SIDE]: "row" },
    overflowX: { default: "hidden", [SIDE_BY_SIDE]: "auto" },
    overflowY: { default: "auto", [SIDE_BY_SIDE]: "hidden" },
    height: "100%",
    padding: "var(--spacing-4)",
  },
  columnShell: {
    flexShrink: 0,
    // Five lanes share a wide pane; a narrow one scrolls sideways.
    flexGrow: 1,
    minWidth: { default: 0, [SIDE_BY_SIDE]: COLUMN_WIDTH },
    maxWidth: { default: "none", [SIDE_BY_SIDE]: 300 },
    flexBasis: { default: "auto", [SIDE_BY_SIDE]: COLUMN_WIDTH },
    width: { default: "100%", [SIDE_BY_SIDE]: null },
    height: { default: "auto", [SIDE_BY_SIDE]: "100%" },
  },
  card: {
    cursor: "grab",
    userSelect: "none",
    touchAction: "manipulation",
    transition: "box-shadow 120ms ease",
    ":hover": { boxShadow: "var(--shadow-med)" },
  },
  carried: { display: "none" },
  // The dragged card is lifted out of flow and follows the pointer. It ignores
  // pointer events so hit-testing reads the columns underneath it.
  floating: {
    position: "fixed",
    insetBlockStart: 0,
    insetInlineStart: 0,
    pointerEvents: "none",
    cursor: "grabbing",
    boxShadow: "var(--shadow-high)",
    zIndex: 1000,
  },
  floatingAt: (x: number, y: number, width: number) => ({ width, transform: `translate(${x}px, ${y}px)` }),
  // Placeholder marking the landing slot; matches the dragged card's height.
  ghost: (height: number) => ({ height, borderRadius: "var(--radius-container)", backgroundColor: "var(--color-background-muted)" }),
  toolbarDivider: { height: "auto", marginBlock: "var(--spacing-1)", alignSelf: "stretch" },
  columnEmptyState: { paddingBlock: "var(--spacing-10)" },
});

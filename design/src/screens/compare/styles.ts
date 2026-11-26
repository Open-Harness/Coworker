import * as stylex from "@stylexjs/stylex";
import { colorVars, spacingVars } from "@astryxdesign/core/theme/tokens.stylex";

export const styles = stylex.create({
  // The winner's wash, filling the whole cell. It undoes the cell's padding, so it follows density="spacious" on the table.
  best: {
    backgroundColor: colorVars["--color-background-blue"],
    boxSizing: "content-box",
    marginBlock: `calc(-1 * ${spacingVars["--spacing-3"]})`,
    marginInline: `calc(-1 * ${spacingVars["--spacing-4"]})`,
    paddingBlock: spacingVars["--spacing-3"],
    paddingInline: spacingVars["--spacing-4"],
  },
  frame: { width: "100%", maxWidth: "100%", minWidth: 0 },
  group: { position: "sticky", insetInlineStart: spacingVars["--spacing-6"], width: "fit-content" },
});

import type { CSSProperties, ReactNode } from "react";
import { VStack } from "@astryxdesign/core/Stack";

/**
 * A collapsible SideNavItem sizes itself to its children's longest line, so long titles push past the sidebar
 * (Astryx 0.7.17). Leaving the children out of that sum lets every row shorten its title instead.
 */
const unsized: CSSProperties = { contain: "inline-size" };

/** The rows inside a collapsible row. */
export function NavGroup({ children }: { readonly children: ReactNode }) {
  return (
    <VStack gap={0.5} style={unsized}>
      {children}
    </VStack>
  );
}

import { type ReactNode, useState } from "react";
import { useContainerReveal } from "@astryxdesign/core/hooks";
import { SideNavItem, type SideNavItemProps } from "@astryxdesign/core/SideNav";
import { HStack, Stack } from "@astryxdesign/core/Stack";

type RevealRowProps = Omit<SideNavItemProps, "actions"> & {
  /** The row's controls, told when their menu opens so the row keeps showing them. */
  readonly renderActions: (onOpenChange: (isOpen: boolean) => void) => ReactNode;
};

/** A navigation row whose controls show on hover, on focus, and on touch screens. */
export function RevealRow({ renderActions, ...item }: RevealRowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { getContainerProps, getContentRevealProps } = useContainerReveal();
  return (
    <Stack {...getContainerProps(isMenuOpen ? { forceState: "active" } : {})}>
      <SideNavItem {...item} actions={<HStack {...getContentRevealProps()}>{renderActions(setIsMenuOpen)}</HStack>} />
    </Stack>
  );
}

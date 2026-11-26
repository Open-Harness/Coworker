// astryx-template: table-tree
import type { RefObject } from "react";
import { HStack, StackItem } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { SizeProvider } from "@astryxdesign/core/SizeContext";
import { TextInput } from "@astryxdesign/core/TextInput";
import { MagnifyingGlassIcon as SearchIcon, TagIcon } from "@heroicons/react/24/outline";
import type { StateFilter } from "./rows.ts";

const STATES: ReadonlyArray<{ value: StateFilter; label: string }> = [
  { value: "all", label: "All states" },
  { value: "working", label: "Working" },
  { value: "needs you", label: "Waits for you" },
  { value: "stuck", label: "Stuck" },
  { value: "idle", label: "Idle" },
];

interface FilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  state: StateFilter;
  onStateChange: (value: StateFilter) => void;
  shown: number;
  total: number;
  versions: number;
  isNarrow: boolean;
  isSearchOpen: boolean;
  onSearchOpen: () => void;
  onVersions: () => void;
}

/** The bar between the page header and the tree: which managers you are looking at on the left, and how to find one on the right. */
export function FilterBar({
  query,
  onQueryChange,
  searchRef,
  state,
  onStateChange,
  shown,
  total,
  versions,
  isNarrow,
  isSearchOpen,
  onSearchOpen,
  onVersions,
}: FilterBarProps) {
  const versionsLabel = `${versions} versions`;
  return (
    // One height for the whole row: Button and TextInput read the context; IconButton and DropdownMenu are told directly.
    <SizeProvider value="sm">
      <HStack gap={2} vAlign="center" wrap="wrap">
        <DropdownMenu
          button={{ label: STATES.find((one) => one.value === state)?.label ?? "All states", size: "sm" }}
          hasChevron
          items={STATES.map((one) => ({ label: one.label, onClick: () => onStateChange(one.value) }))}
        />
        <Text type="supporting" color="secondary">
          {shown === total ? `${total - 1} managers` : `${shown} of ${total} managers`}
        </Text>
        {isNarrow ? (
          <IconButton variant="ghost" size="sm" icon={<Icon icon={TagIcon} size="sm" />} label={versionsLabel} onClick={onVersions} />
        ) : (
          <Button variant="ghost" size="sm" label={versionsLabel} onClick={onVersions} />
        )}
        <StackItem size="fill">
          <HStack gap={2} hAlign="end" vAlign="center">
            {isNarrow && !isSearchOpen ? (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Icon icon={SearchIcon} size="sm" />}
                label="Find a manager"
                onClick={onSearchOpen}
              />
            ) : (
              <TextInput
                label="Find a manager"
                isLabelHidden
                placeholder="Find a manager"
                startIcon={SearchIcon}
                value={query}
                onChange={onQueryChange}
                hasClear
                ref={searchRef}
              />
            )}
          </HStack>
        </StackItem>
      </HStack>
    </SizeProvider>
  );
}

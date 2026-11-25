import { useMemo } from "react";
import { ChatBubbleLeftIcon, ChatBubbleLeftRightIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { CommandPalette } from "@astryxdesign/core/CommandPalette";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import type { SearchableItem } from "@astryxdesign/core/Typeahead";
import type { SearchEntry, SearchPaletteProps } from "../types.ts";

type Item = SearchableItem<Pick<SearchEntry, "description" | "kind">>;
const ICONS = { chat: ChatBubbleLeftRightIcon, document: DocumentTextIcon, message: ChatBubbleLeftIcon } as const;

const toItem = ({ id, label, description, kind }: SearchEntry): Item => ({ id, label, auxiliaryData: { description, kind } });

function SearchRow({ item }: { readonly item: Item }) {
  return (
    <HStack gap={3} vAlign="center" width="100%">
      <Icon icon={ICONS[item.auxiliaryData?.kind ?? "chat"]} size="sm" color="secondary" />
      <StackItem size="fill">
        <VStack gap={0}>
          <Text maxLines={1}>{item.label}</Text>
          <Text type="supporting" color="secondary" maxLines={1}>
            {item.auxiliaryData?.description ?? ""}
          </Text>
        </VStack>
      </StackItem>
    </HStack>
  );
}

/** Finds chats, documents and messages. */
export function SearchPalette({ isOpen, onOpenChange, recent, search, onPick }: SearchPaletteProps) {
  const source = useMemo(
    () => ({
      bootstrap: () => recent().map(toItem),
      search: async (term: string) => (await search(term)).map(toItem),
    }),
    [recent, search],
  );
  return (
    <CommandPalette
      label="Search"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={source}
      emptyBootstrapText="Search chats, documents and messages"
      renderItem={(item) => <SearchRow item={item} />}
      onValueChange={(id) => {
        onOpenChange(false);
        onPick(id);
      }}
    />
  );
}

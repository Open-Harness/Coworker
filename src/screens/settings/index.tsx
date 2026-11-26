// astryx-template: settings
import { useState, type ComponentType } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Typeahead, type SearchableItem, type SearchSource } from "@astryxdesign/core/Typeahead";
import { MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { useGo, useRead } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import { at, GROUPS, ITEMS, pathOf } from "./nav.ts";
import { PAGES } from "./pages.ts";
import type { Dirty } from "./types.ts";

const FOUND: SearchableItem[] = ITEMS.map((label) => ({ id: label, label }));
const settingsSearchSource: SearchSource<SearchableItem> = {
  search: (query: string) => FOUND.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
  bootstrap: () => FOUND,
};

/** Everything the workspace is made of and runs on: a list of pages on the left, the one you are on in the middle. */
export default function Settings({ params }: PageProps) {
  const [go, isNarrow] = [useGo(), useMediaQuery("(max-width: 768px)")];
  const shell = useRead("/shell");
  const { pathname } = useRouterState({ select: (state) => state.location });
  const item = pathname.endsWith("/settings/connectors/github") ? "Connect GitHub" : at(params["page"]);
  const [save, setSave] = useState<(() => unknown) | null>(null);
  const [searchValue, setSearchValue] = useState<SearchableItem | null>(null);
  const shown = item === "Connect GitHub" ? "Connectors" : item;
  const page = PAGES[item];
  const Body: ComponentType<{ onDirty: Dirty }> | undefined = page?.Body;
  const onDirty: Dirty = (made) => setSave(() => made);

  return (
    <Layout
      height="fill"
      contentWidth={1440}
      header={
        <LayoutHeader hasDivider>
          {/* On a narrow screen the search moves under the title instead of squeezing it. */}
          <HStack vAlign="center" wrap="wrap" gap={2}>
            <StackItem size="fill">
              <VStack gap={0}>
                <Heading level={1}>Settings</Heading>
                <Text type="supporting" color="secondary">
                  {shell._tag === "Ok" ? `${shell.value.workspace.name}, for everyone in it` : "For everyone in the workspace"}
                </Text>
              </VStack>
            </StackItem>
            <Typeahead
              label="Search"
              isLabelHidden
              placeholder="Search settings..."
              searchSource={settingsSearchSource}
              value={searchValue}
              onChange={(chosen) => {
                setSearchValue(null);
                if (chosen) go(pathOf(chosen.id));
              }}
              hasEntriesOnFocus
              startIcon={SearchIcon}
            />
            {page?.save === true && (
              <Button
                label="Save"
                variant="primary"
                isDisabled={save === null}
                onClick={() => void Promise.resolve(save?.()).then(() => setSave(null))}
              />
            )}
          </HStack>
        </LayoutHeader>
      }
      start={
        isNarrow ? undefined : (
          <LayoutPanel hasDivider={false} width={220} padding={2}>
            <VStack gap={4}>
              {GROUPS.map((group) => (
                <List
                  key={group.title}
                  density="balanced"
                  header={
                    <HStack paddingInline={2}>
                      <Text type="supporting" color="secondary" weight="semibold">
                        {group.title}
                      </Text>
                    </HStack>
                  }
                >
                  {group.items.map((name) => (
                    <ListItem
                      key={name}
                      label={name}
                      isSelected={name === shown}
                      aria-current={name === shown ? "page" : undefined}
                      onClick={() => go(pathOf(name))}
                    />
                  ))}
                </List>
              ))}
            </VStack>
          </LayoutPanel>
        )
      }
      content={
        <LayoutContent role="main" padding={page?.fills === true ? 0 : 4} isScrollable={page?.fills !== true}>
          <VStack gap={4} {...(page?.fills === true ? { height: "100%" } : {})}>
            {/* Phone: fifteen pages are too many for a row of tabs, so the list becomes a menu. */}
            {isNarrow && (
              <Selector
                label="Page"
                isLabelHidden
                value={shown}
                onChange={(chosen) => go(pathOf(chosen))}
                options={ITEMS.map((name) => ({ value: name, label: name }))}
              />
            )}
            {Body ? (
              <Body key={item} onDirty={onDirty} />
            ) : (
              <Center axis="both" minHeight={320}>
                <EmptyState title={item} description="Not drawn yet." />
              </Center>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

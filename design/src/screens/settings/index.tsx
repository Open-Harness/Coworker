// astryx-template: settings
import { useEffect, useState, type ComponentType } from "react";
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
import { go } from "../../shell";
import { WORKSPACE } from "../../world";
import { at, GROUPS, ITEMS, slugOf } from "./data";
import { useToast } from "@astryxdesign/core/Toast";
import { General } from "./general";

/** Each other page is a file in ./pages, named by its slug. `meta.save`: it has the header's one Save. `meta.fills`: it fills the pane itself. */
interface Page { readonly default: ComponentType<{ onDirty: () => void }>; readonly meta?: { readonly save?: boolean; readonly fills?: boolean } }
const PAGES = import.meta.glob<Page>("./pages/*.tsx", { eager: true });
const pageOf = (item: string): Page | undefined => item === "General" ? { default: General, meta: { save: true } } : PAGES[`./pages/${slugOf(item).slice(4)}.tsx`];

const FOUND: SearchableItem[] = ITEMS.map((label) => ({ id: slugOf(label), label }));
const settingsSearchSource: SearchSource<SearchableItem> = {
  search: (query: string) => FOUND.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
  bootstrap: () => FOUND,
};

export default function Settings() {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [current, setCurrent] = useState(at(location.hash.slice(1)));
  useEffect(() => { const on = () => setCurrent(at(location.hash.slice(1))); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  const showToast = useToast();
  const [isDirty, setDirty] = useState(false);
  /** A page reached from another one (Connect GitHub) lights up the page it sits under. */
  const shown = current === "Connect GitHub" ? "Connectors" : current;
  const page = pageOf(current);
  const Body = page?.default;
  const [searchValue, setSearchValue] = useState<SearchableItem | null>(null);

  return (
    <Layout
      height="fill"
      contentWidth={1440}
      header={
        <LayoutHeader hasDivider>
          {/* On a narrow screen the search moves under the title instead of squeezing it. */}
          <HStack vAlign="center" wrap="wrap" gap={2}>
            <StackItem size="fill"><VStack gap={0}><Heading level={1}>Settings</Heading><Text type="supporting" color="secondary">{WORKSPACE}, for everyone in it</Text></VStack></StackItem>
            <Typeahead label="Search" isLabelHidden placeholder="Search settings..." searchSource={settingsSearchSource} value={searchValue}
              onChange={(v) => { setSearchValue(null); if (v) go(v.id); }} hasEntriesOnFocus startIcon={SearchIcon} />
            {page?.meta?.save === true && <Button label="Save" variant="primary" isDisabled={!isDirty} onClick={() => { setDirty(false); showToast({ body: "Saved", uniqueID: "save" }); }} />}
          </HStack>
        </LayoutHeader>
      }
      start={
        isNarrow ? undefined : (
          <LayoutPanel hasDivider={false} width={220} padding={2}>
            <VStack gap={4}>
              {GROUPS.map((g) => (
                <List key={g.title} density="balanced" header={<HStack paddingInline={2}><Text type="supporting" color="secondary" weight="semibold">{g.title}</Text></HStack>}>
                  {g.items.map((item) => (
                    <ListItem key={item} label={item} isSelected={item === shown} aria-current={item === shown ? "page" : undefined} onClick={() => go(slugOf(item))} />
                  ))}
                </List>
              ))}
            </VStack>
          </LayoutPanel>
        )
      }
      content={
        <LayoutContent role="main" padding={page?.meta?.fills === true ? 0 : 4} isScrollable={page?.meta?.fills !== true}>
          <VStack gap={4} {...(page?.meta?.fills === true ? { height: "100%" } : {})}>
            {/* Phone: fifteen pages are too many for a row of tabs, so the list becomes a menu. */}
            {isNarrow && <Selector label="Page" isLabelHidden value={shown} onChange={(v) => go(slugOf(v))} options={ITEMS.map((i) => ({ value: i, label: i }))} />}
            {Body ? <Body key={current} onDirty={() => setDirty(true)} /> : <Center axis="both" minHeight={320}><EmptyState title={current} description="Not drawn yet." {...(current === "Profile" ? { actions: <Button label="Sign out" onClick={() => go("signin")} /> } : {})} /></Center>}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

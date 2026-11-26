// astryx-template: table-inbox
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Badge } from "@astryxdesign/core/Badge";
import { Icon } from "@astryxdesign/core/Icon";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel, HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Table } from "@astryxdesign/core/Table";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { InboxIcon } from "@heroicons/react/24/outline";
import { LIST_MIN_WIDTH, PANE_DEFAULT_SHARE, PANE_MIN_WIDTH, SINGLE_SURFACE_BELOW, STACK_ROWS_BELOW, useSurfaceWidth } from "../email/surface";
import { CONVOS } from "./convos";
import { FILTERS, inFilter, ITEMS, type Entry, type Filter, type Item } from "./data";
import { useColumns, useRows } from "./list";
import { E412, E418 } from "./pr418";
import { Record as ItemPane } from "./record";

const START = { ...CONVOS, "412": E412, "418": E418 } as Readonly<Record<string, readonly Entry[]>>;
const matches = (i: Item, q: string) => [i.title, i.id, i.author, i.waits, i.work ?? ""].some((t) => t.toLowerCase().includes(q.trim().toLowerCase()));

/** What Coding sees on acme/web: the issues and pull requests to filter, and one opened beside the list as GitHub shows it. */
export default function GitHubView({ manager: _id }: { manager: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  const [entries, setEntries] = useState<Record<string, readonly Entry[]>>(START);
  const [yours, setYours] = useState<Record<string, boolean>>({});
  const [n, setN] = useState(0);

  const visible = useMemo(() => ITEMS.filter((i) => inFilter(i, filter) && matches(i, query)), [filter, query]);
  const [surfaceRef, surfaceWidth] = useSurfaceWidth();
  const [listRef, listWidth] = useSurfaceWidth();
  const isMeasured = surfaceWidth > 0;
  const isSingle = isMeasured && surfaceWidth < SINGLE_SURFACE_BELOW;
  const isStacked = listWidth > 0 && listWidth < STACK_ROWS_BELOW;
  const openId = chosen === null ? null : chosen !== undefined && visible.some((i) => i.id === chosen) ? chosen : isSingle ? null : (visible[0]?.id ?? null);
  const open = visible.find((i) => i.id === openId) ?? null;

  const add = useCallback((id: string, ...more: Entry[]) => setEntries((e) => ({ ...e, [id]: [...(e[id] ?? []), ...more] })), []);
  const tell = (text: string) => { if (open) { add(open.id, { kind: "event", id: `t${n}`, at: "09:54", text: `You told Coding: ${text}` }); setN(n + 1); } };
  const write = (text: string) => {
    if (!open) return;
    const took: Entry[] = yours[open.id] ? [] : [{ kind: "event", id: `k${n}`, at: "09:54", text: "Ama Mensah took over" }];
    add(open.id, ...took, { kind: "comment", id: `w${n}`, by: "Juno", at: "25 Nov, 09:54", body: [text], mine: true, as: "Ama Mensah, as Juno" });
    setYours((y) => ({ ...y, [open.id]: true })); setN(n + 1);
  };
  const handBack = () => { if (open) { setYours((y) => ({ ...y, [open.id]: false })); add(open.id, { kind: "event", id: `h${n}`, at: "09:54", text: "Coding has it again" }); setN(n + 1); } };

  const hasPlaced = useRef(false);
  const pane = useResizable({ defaultSize: "58%", minSize: PANE_MIN_WIDTH, maxSize: isMeasured ? Math.max(PANE_MIN_WIDTH, surfaceWidth - LIST_MIN_WIDTH) : undefined, onSizeChange: () => { if (hasPlaced.current) hasPlaced.current = false; } });
  const { resize } = pane;
  useLayoutEffect(() => { if (isMeasured) { hasPlaced.current = true; resize(Math.round(surfaceWidth * PANE_DEFAULT_SHARE)); } }, [isMeasured, surfaceWidth, resize]);

  const columns = useColumns({ isStacked });
  const rows = useRows({ openId, onOpen: (i) => setChosen(i.id) });
  const counts = (f: Filter) => ITEMS.filter((i) => inFilter(i, f)).length;
  const paneProps = open ? { item: open, entries: entries[open.id] ?? [], isYours: yours[open.id] ?? false, onClose: () => setChosen(null), onTell: tell, onWrite: write, onHandBack: handBack } : null;
  const full = isSingle && paneProps !== null;

  return (
    <Layout
      ref={surfaceRef} height="fill" aria-label="GitHub: acme/web"
      header={full ? undefined : (
        <LayoutHeader hasDivider={false} padding={0}>
          <VStack gap={0}>
            <HStack gap={3} vAlign="center" wrap="wrap" paddingInline={4} paddingBlock={3}>
              <StackItem size="fill"><TextInput label="Search issues and pull requests" isLabelHidden startIcon="search" placeholder="Search by title, number or person" value={query} onChange={setQuery} hasClear width="100%" /></StackItem>
              <Text type="supporting" color="secondary">{ITEMS.filter((i) => i.state === "Open").length} open of {ITEMS.length}</Text>
            </HStack>
            <VStack paddingInline={1}>
              <TabList hasDivider value={filter} onChange={(v) => setFilter(v as Filter)}>
                {FILTERS.map((f) => <Tab key={f.value} value={f.value} label={f.label} endContent={<Badge label={String(counts(f.value))} variant="neutral" />} />)}
              </TabList>
            </VStack>
          </VStack>
        </LayoutHeader>
      )}
      content={
        <LayoutContent role="main" ref={listRef} padding={full ? 0 : 4} isScrollable>
          {full && paneProps ? <ItemPane {...paneProps} isFullWidth /> : visible.length === 0 ? (
            <VStack padding={6}><EmptyState title="Nothing here" description={query.trim() === "" ? "Nothing in this tab." : "Nothing matches your search."} icon={<Icon icon={InboxIcon} size="lg" />}
              actions={<Button label={query.trim() === "" ? "Show all" : "Clear search"} variant="secondary" onClick={() => (query.trim() === "" ? setFilter("all") : setQuery(""))} />} /></VStack>
          ) : <Table data={visible} columns={columns} idKey="id" plugins={{ rows }} density="balanced" dividers="none" hasHover textOverflow="truncate" />}
        </LayoutContent>
      }
      end={isSingle || !paneProps ? undefined : (
        <>
          <ResizeHandle direction="horizontal" isReversed hasDivider pillPlacement="end" resizable={pane.props} label="Resize the open one" />
          <LayoutPanel resizable={pane.props} padding={0} role="complementary" label="Open issue or pull request"><ItemPane {...paneProps} isFullWidth={false} /></LayoutPanel>
        </>
      )}
    />
  );
}

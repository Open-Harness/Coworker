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
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { RepoView } from "~/modules/views-connector/types.ts";
import {
  LIST_MIN_WIDTH,
  PANE_DEFAULT_SHARE,
  PANE_MIN_WIDTH,
  SINGLE_SURFACE_BELOW,
  STACK_ROWS_BELOW,
  useSurfaceWidth,
} from "../email/surface.ts";
import { useSending } from "../whatsapp/sending.ts";
import { itemOf } from "./adapt.ts";
import { FILTERS, inFilter, type Filter, type Item } from "./data.ts";
import { useColumns, useRows } from "./list.tsx";
import { OpenRecord } from "./open.tsx";

const matches = (i: Item, q: string) =>
  [i.title, i.id, i.author, i.waits, i.work ?? ""].some((t) => t.toLowerCase().includes(q.trim().toLowerCase()));

interface Who {
  readonly manager: string;
  readonly managerName: string;
  readonly who: string;
  readonly zone: string;
}

/** What Coding sees on a repository: the issues and pull requests to filter, and one opened beside the list as GitHub shows it. */
function Repo({ view, ...names }: { readonly view: RepoView } & Who) {
  const clock = useClock();
  const sending = useSending("github", names.manager);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  const [yours, setYours] = useState<Readonly<Record<string, boolean>>>({});

  const items = useMemo(() => view.items.map((i) => itemOf(i, clock, names.zone)), [view, clock, names.zone]);
  const visible = useMemo(() => items.filter((i) => inFilter(i, filter) && matches(i, query)), [items, filter, query]);
  const [surfaceRef, surfaceWidth] = useSurfaceWidth();
  const [listRef, listWidth] = useSurfaceWidth();
  const isMeasured = surfaceWidth > 0;
  const isSingle = isMeasured && surfaceWidth < SINGLE_SURFACE_BELOW;
  const isStacked = listWidth > 0 && listWidth < STACK_ROWS_BELOW;
  const openId =
    chosen === null
      ? null
      : chosen !== undefined && visible.some((i) => i.id === chosen)
        ? chosen
        : isSingle
          ? null
          : (visible[0]?.id ?? null);
  const open = visible.find((i) => i.id === openId) ?? null;

  const hasPlaced = useRef(false);
  const pane = useResizable({
    defaultSize: "58%",
    minSize: PANE_MIN_WIDTH,
    ...(isMeasured ? { maxSize: Math.max(PANE_MIN_WIDTH, surfaceWidth - LIST_MIN_WIDTH) } : {}),
    onSizeChange: () => {
      if (hasPlaced.current) hasPlaced.current = false;
    },
  });
  const { resize } = pane;
  useLayoutEffect(() => {
    if (isMeasured) {
      hasPlaced.current = true;
      resize(Math.round(surfaceWidth * PANE_DEFAULT_SHARE));
    }
  }, [isMeasured, surfaceWidth, resize]);

  const columns = useColumns({ isStacked });
  const onOpen = useCallback((i: Item) => setChosen(i.id), []);
  const rows = useRows({ openId, onOpen });
  const counts = (f: Filter) => items.filter((i) => inFilter(i, f)).length;
  const record = (isFullWidth: boolean) =>
    open === null ? null : (
      <OpenRecord
        {...names}
        item={open}
        isYours={yours[open.id] ?? false}
        isFullWidth={isFullWidth}
        onClose={() => setChosen(null)}
        onTell={(text) => void sending.send(open.id, "tell", text)}
        onWrite={(text) => {
          setYours((was) => ({ ...was, [open.id]: true }));
          void sending.send(open.id, "write", text);
        }}
        onHandBack={() => {
          setYours((was) => ({ ...was, [open.id]: false }));
          void sending.send(open.id, "hand back", "");
        }}
      />
    );
  const full = isSingle && open !== null;

  return (
    <Layout
      ref={surfaceRef}
      height="fill"
      aria-label={`GitHub: ${view.repo}`}
      header={
        full ? undefined : (
          <LayoutHeader hasDivider={false} padding={0}>
            <VStack gap={0}>
              <HStack gap={3} vAlign="center" wrap="wrap" paddingInline={4} paddingBlock={3}>
                <StackItem size="fill">
                  <TextInput
                    label="Search issues and pull requests"
                    isLabelHidden
                    startIcon="search"
                    placeholder="Search by title, number or person"
                    value={query}
                    onChange={setQuery}
                    hasClear
                    width="100%"
                  />
                </StackItem>
                <Text type="supporting" color="secondary">
                  {items.filter((i) => i.state === "Open").length} open of {items.length}
                </Text>
              </HStack>
              <VStack paddingInline={1}>
                <TabList hasDivider value={filter} onChange={(v) => setFilter(v as Filter)}>
                  {FILTERS.map((f) => (
                    <Tab
                      key={f.value}
                      value={f.value}
                      label={f.label}
                      endContent={<Badge label={String(counts(f.value))} variant="neutral" />}
                    />
                  ))}
                </TabList>
              </VStack>
            </VStack>
          </LayoutHeader>
        )
      }
      content={
        <LayoutContent role="main" ref={listRef} padding={full ? 0 : 4} isScrollable>
          {full ? (
            record(true)
          ) : visible.length === 0 ? (
            <VStack padding={6}>
              <EmptyState
                title="Nothing here"
                description={query.trim() === "" ? "Nothing in this tab." : "Nothing matches your search."}
                icon={<Icon icon={InboxIcon} size="lg" />}
                actions={
                  <Button
                    label={query.trim() === "" ? "Show all" : "Clear search"}
                    variant="secondary"
                    onClick={() => (query.trim() === "" ? setFilter("all") : setQuery(""))}
                  />
                }
              />
            </VStack>
          ) : (
            <Table
              data={visible}
              columns={columns}
              idKey="id"
              plugins={{ rows }}
              density="balanced"
              dividers="none"
              hasHover
              textOverflow="truncate"
            />
          )}
        </LayoutContent>
      }
      end={
        isSingle || open === null ? undefined : (
          <>
            <ResizeHandle
              direction="horizontal"
              isReversed
              hasDivider
              pillPlacement="end"
              resizable={pane.props}
              label="Resize the open one"
            />
            <LayoutPanel resizable={pane.props} padding={0} role="complementary" label="Open issue or pull request">
              {record(false)}
            </LayoutPanel>
          </>
        )
      }
    />
  );
}

export default function GitHubView({ manager }: { readonly manager: string }) {
  const shell = useRead("/shell");
  const overview = useRead("/m/:manager", { manager });
  if (shell._tag !== "Ok" || overview._tag !== "Ok") return null;
  const { coworker, workspace } = shell.value;
  return (
    <Reading from="/m/:manager/connectors/github?repo" parts={{ manager }} failed="We could not read this repository">
      {(view) => <Repo view={view} manager={manager} managerName={overview.value.head.name} who={coworker.name} zone={workspace.zone} />}
    </Reading>
  );
}

// astryx-template: table-tree
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layout, LayoutContent, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import type { TableColumn } from "@astryxdesign/core/Table";
import {
  Table,
  useTableColumnResize,
  useTableSortable,
  useTableSortableState,
  useTableTreeData,
  useTableTreeState,
} from "@astryxdesign/core/Table";
import { Reading, useGo, useHref } from "~/modules/page/service.ts";
import type { TreeView } from "~/modules/views-workspace/types.ts";
import { FilterBar } from "./bar.tsx";
import { buildColumns } from "./columns.tsx";
import { TreeHeader } from "./header.tsx";
import { useDay } from "./day.ts";
import { useTreeKeyboardNav } from "./keyboard.ts";
import { useMeasuredWidth } from "./measure.ts";
import { PagesPanel } from "./pages.tsx";
import { AboutPanel } from "./rail.tsx";
import { collectIds, countMatches, pruneTree, treeOf, withRollups, type Row, type StateFilter } from "./rows.ts";

/** Header width below which the actions and search give up their space. */
const NARROW_HEADER = 720;

/**
 * The root manager's page: a tree of managers whose parent rows are derived from the managers beneath them. Rollups run
 * again after a filter, because removing managers changes what every parent above them adds up; sorting reorders each
 * sibling group in place; search prunes the tree and force-expands what survives.
 */
function Managers({ view }: { readonly view: TreeView }) {
  const [go, href, day] = [useGo(), useHref(), useDay()];
  const root = view.rows.find((row) => row.above === null);
  const all = useMemo(() => treeOf(view), [view]);
  const everyone = useMemo(() => collectIds(all, new Set<string>()), [all]);
  const [total, versions] = [all[0]?.count ?? 0, all[0]?.versions ?? 0];

  const [query, setQuery] = useState("");
  const [state, setState] = useState<StateFilter>("all");
  const [manualExpandedIds, setManualExpandedIds] = useState<ReadonlySet<string>>(() => new Set(everyone));
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Two regions, two numbers: the header spans the page and decides whether the actions keep their labels; the filter bar can be far narrower.
  const headerRef = useRef<HTMLDivElement>(null);
  const headerWidth = useMeasuredWidth(headerRef);
  const isNarrowHeader = headerWidth != null && headerWidth <= NARROW_HEADER;
  const bodyRef = useRef<HTMLDivElement>(null);
  const bodyWidth = useMeasuredWidth(bodyRef);
  const isNarrowBody = bodyWidth != null && bodyWidth <= NARROW_HEADER;
  // The pane already has the sidebar, so the rail only fits beside the tree on a wide screen; below that it moves under the pages.
  const isRailInline = headerWidth != null && headerWidth >= 1100;

  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  // Collapsing with a query still applied would hide the reason the tree is pruned. Bound natively: TextInput takes no `onBlur`.
  useEffect(() => {
    const input = searchRef.current;
    if (input == null) return;
    const collapseIfEmpty = () => {
      if (query === "") setIsSearchOpen(false);
    };
    input.addEventListener("blur", collapseIfEmpty);
    return () => input.removeEventListener("blur", collapseIfEmpty);
  }, [query, isSearchOpen]);

  const needle = query.trim().toLowerCase();
  const isFiltering = needle.length > 0 || state !== "all";
  const data = useMemo(() => (isFiltering ? withRollups(pruneTree(all, needle, state)) : all), [all, isFiltering, needle, state]);
  // While filtering, expansion comes from the pruned tree so no match hides behind a collapsed parent; the manual state is parked.
  const filterExpandedIds = useMemo(() => (isFiltering ? collectIds(data, new Set<string>()) : null), [isFiltering, data]);
  const expandedIds = filterExpandedIds ?? manualExpandedIds;

  const sortable = useTableSortableState<Row>({
    data,
    comparators: {
      name: (a, b) => a.name.localeCompare(b.name),
      now: (a, b) => a.now.localeCompare(b.now),
      open: (a, b) => a.open - b.open,
      waiting: (a, b) => a.waiting - b.waiting,
      sentBack: (a, b) => a.sentBack - b.sentBack,
      changed: (a, b) => a.changedAt - b.changedAt,
    },
  });
  const { visibleData, treeConfig } = useTableTreeState<Row>({
    data,
    idKey: "id",
    expandedIds,
    onExpandedIdsChange: isFiltering ? () => {} : setManualExpandedIds,
    // Reorders each sibling group in place, so children never leave their parent.
    sortSiblings: sortable.applySort,
  });
  const setExpanded = useCallback(
    (id: string, shouldExpand: boolean) => {
      if (isFiltering) return;
      setManualExpandedIds((previous) => {
        const next = new Set(previous);
        if (shouldExpand) next.add(id);
        else next.delete(id);
        return next;
      });
    },
    [isFiltering],
  );
  const columns = useMemo(
    () => buildColumns(isNarrowBody, (id) => href(id === "root" ? "/managers" : `/m/${id}`), day),
    [isNarrowBody, href, day],
  );

  // Focus follows `focusedId`, whether it moved by arrow key or by click: one path keeps the roving tabindex and the DOM in agreement.
  const shouldFocusRef = useRef(false);
  const moveFocus = useCallback((id: string) => {
    shouldFocusRef.current = true;
    setFocusedId(id);
  }, []);
  useEffect(() => {
    if (!shouldFocusRef.current || focusedId == null) return;
    shouldFocusRef.current = false;
    bodyRef.current?.querySelector<HTMLElement>(`tr[data-row-id="${CSS.escape(focusedId)}"]`)?.focus();
  }, [focusedId, visibleData]);

  const tree = useTableTreeData({ ...treeConfig, hasExpandAllControl: true });
  const sort = useTableSortable<Row>(sortable.sortConfig);
  const resize = useTableColumnResize<Row>({
    columnWidths,
    onColumnResizeEnd: (updates) => setColumnWidths((previous) => ({ ...previous, ...updates })),
    // The plugin asks for columns of any row; ours are of Row.
    columns: columns as TableColumn<Record<string, unknown>>[],
  });
  const keyboard = useTreeKeyboardNav({
    rows: visibleData,
    focusedId,
    onFocusedIdChange: moveFocus,
    expandedIds,
    onExpand: (id) => setExpanded(id, true),
    onCollapse: (id) => setExpanded(id, false),
    onOpen: (id) => go(id === "root" ? "/managers" : `/m/${id}`),
  });
  const shown = useMemo(() => (isFiltering ? countMatches(all, needle, state) : total), [all, isFiltering, needle, state, total]);

  if (root === undefined) return <EmptyState title="No managers yet" description="Make one and it shows here." />;
  const about = <AboutPanel view={view} root={root} versions={versions} day={day} />;
  const askJuno = () => go("/");
  const newObjective = () => go("/set-up");
  return (
    <Layout
      // `fill` would pin the layout to the pane and trap the pages below the fold; `auto` lets the page itself scroll.
      height="auto"
      contentWidth={1440}
      end={
        !isRailInline ? undefined : (
          <LayoutPanel width={296} padding={4} role="complementary" label="About Juno" isScrollable={false}>
            {about}
          </LayoutPanel>
        )
      }
      header={<TreeHeader root={root} isNarrow={isNarrowHeader} headerRef={headerRef} onAsk={askJuno} onNew={newObjective} />}
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={6} ref={bodyRef}>
            {isNarrowHeader && (
              <Text type="supporting" color="secondary">
                {root.now}
              </Text>
            )}
            <FilterBar
              query={query}
              onQueryChange={setQuery}
              searchRef={searchRef}
              state={state}
              onStateChange={setState}
              shown={shown}
              total={total}
              versions={versions}
              isNarrow={isNarrowBody}
              isSearchOpen={isSearchOpen}
              onSearchOpen={() => setIsSearchOpen(true)}
              onVersions={() => go("/juno/history")}
            />
            {data.length === 0 ? (
              <EmptyState
                title="No manager matches"
                description="No manager has that name or is doing that, in that state."
                actions={
                  <Button
                    label="Clear"
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setState("all");
                    }}
                  />
                }
              />
            ) : (
              // The tree reads as one bounded object. `padding={0}` lets rows reach the border so the stripes are full-bleed inside the card.
              <Card padding={0}>
                <Table
                  data={visibleData}
                  columns={columns}
                  idKey="id"
                  density="compact"
                  // Rows are separated by tint, not by rule.
                  dividers="none"
                  textOverflow="truncate"
                  plugins={{ tree, sort, resize, keyboard }}
                />
              </Card>
            )}
            <PagesPanel pages={view.pages} />
            {/* Same panel, different slot: once the layout drops the rail the details stack under the pages, as on a phone. */}
            {!isRailInline && (
              <>
                <Divider />
                {about}
              </>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

export default function TreePage() {
  return (
    <Reading from="/tree" failed="We could not read the managers">
      {(view) => <Managers view={view} />}
    </Reading>
  );
}

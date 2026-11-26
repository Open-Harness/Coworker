import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useTableColumnResize,
  useTableSortable,
  useTableSortableState,
  useTableTreeData,
  useTableTreeState,
} from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { buildColumns } from "./columns.tsx";
import { useTreeKeyboardNav } from "./keyboard.ts";
import { collectIds, countMatches, pruneTree, withRollups, type Row, type StateFilter } from "./model.ts";

/** Search and the state filter, sorting, expanding and the keys of the tree, in one place: what the table is given. */
export function useThreadTree(props: {
  readonly all: Row[];
  readonly manager: string;
  readonly href: (to: string) => string;
  readonly go: (to: string) => void;
  readonly isNarrow: boolean;
}) {
  const { all, manager, href, go, isNarrow } = props;
  const total = all.reduce((sum, one) => sum + one.beneath, 0);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<StateFilter>("all");
  const [manualExpandedIds, setManualExpandedIds] = useState<ReadonlySet<string>>(() => collectIds(all, new Set<string>()));
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const isFiltering = needle.length > 0 || state !== "all";
  const data = useMemo(() => (isFiltering ? withRollups(pruneTree(all, needle, state)) : all), [all, isFiltering, needle, state]);
  // While filtering, expansion is derived from the pruned tree so no match can hide behind a collapsed parent; manual state is parked.
  const filterExpandedIds = useMemo(() => (isFiltering ? collectIds(data, new Set<string>()) : null), [isFiltering, data]);
  const expandedIds = filterExpandedIds ?? manualExpandedIds;

  const sortable = useTableSortableState<Row>({
    data,
    comparators: {
      name: (a, b) => a.name.localeCompare(b.name),
      task: (a, b) => a.task.localeCompare(b.task),
      from: (a, b) => a.from.localeCompare(b.from),
      knew: (a, b) => (a.knew ?? 0) - (b.knew ?? 0),
      cost: (a, b) => a.cost - b.cost,
    },
  });
  const { visibleData, treeConfig } = useTableTreeState<Row>({
    data,
    idKey: "id",
    expandedIds,
    onExpandedIdsChange: isFiltering ? () => {} : setManualExpandedIds,
    // Reorders each sibling group in place, so children never leave their parent: what keeps sorting and hierarchy compatible.
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
  const expandRow = useCallback((id: string) => setExpanded(id, true), [setExpanded]);
  const collapseRow = useCallback((id: string) => setExpanded(id, false), [setExpanded]);
  const columns = useMemo(() => buildColumns(manager, href, isNarrow), [manager, href, isNarrow]);

  // Focus follows `focusedId`, whether it moved by arrow key or by click, so one path keeps the roving tabindex and the DOM in agreement.
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
    columns: columns as TableColumn<Record<string, unknown>>[],
  });
  const keyboard = useTreeKeyboardNav({
    rows: visibleData,
    focusedId,
    onFocusedIdChange: moveFocus,
    expandedIds,
    onExpand: expandRow,
    onCollapse: collapseRow,
    onOpen: (id) => go(`/m/${manager}/threads/${id}`),
  });
  const shown = useMemo(() => (isFiltering ? countMatches(all, needle, state) : total), [all, isFiltering, needle, state, total]);
  return { query, setQuery, state, setState, data, shown, bodyRef, visibleData, columns, plugins: { tree, sort, resize, keyboard } };
}

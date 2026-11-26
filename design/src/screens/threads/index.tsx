// astryx-template: table-tree
'use client';

/**
 * A manager's threads: every thread is a fork, so they form a tree. The
 * roots are the conversations the manager holds; a parent row counts what is
 * beneath it, computed from the threads and run again after a filter.
 * Sorting reorders each sibling group in place, and search prunes the tree
 * and force-expands what survives.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  HStack,
  Layout,
  LayoutContent,
  LayoutPanel,
  VStack,
} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {DropdownMenu} from '@astryxdesign/core/DropdownMenu';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Toolbar} from '@astryxdesign/core/Toolbar';
import {useMediaQuery} from '@astryxdesign/core/hooks';
import {
  Table,
  useTableColumnResize,
  useTableSortable,
  useTableSortableState,
  useTableTreeData,
  useTableTreeState,
} from '@astryxdesign/core/Table';
import type {TableColumn} from '@astryxdesign/core/Table';
import * as stylex from '@stylexjs/stylex';
import {MagnifyingGlassIcon as SearchIcon} from '@heroicons/react/24/outline';
import {buildColumns, STATE_LABEL} from './columns';
import {useTreeKeyboardNav} from './keyboard';
import {PagesPanel} from './pages';
import {AboutPanel} from './rail';
import {
  ALL_ROWS,
  collectIds,
  countMatches,
  flatten,
  pruneTree,
  withRollups,
  type Row,
  type StateFilter,
} from './rows';

const styles = stylex.create({
  /*
   * Toolbar pads its own contents by 12px, but the table body sits on a 16px
   * content line. The difference is added out here so the two agree.
   */
  headerContainer: {
    paddingInline: '4px',
  },
});

/** Header width below which the search gives up its space. */
const NARROW_HEADER = 720;

const STATES: ReadonlyArray<{value: StateFilter; label: string}> = [
  {value: 'all', label: 'All states'},
  {value: 'working', label: STATE_LABEL.working},
  {value: 'needs-you', label: STATE_LABEL['needs-you']},
  {value: 'done', label: STATE_LABEL.done},
];

/** Reports the observed width of whatever the returned ref is attached to. */
function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>): number | null {
  // Null until measured, so the first paint is not committed to a guess.
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element == null) {
      return;
    }
    const observer = new ResizeObserver(entries => {
      setWidth(entries[0]?.contentRect.width ?? null);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const EVERY_PARENT = collectIds(ALL_ROWS, new Set<string>());
const TOTAL = flatten(ALL_ROWS).filter(r => r.kind === 'thread').length;

export default function ThreadsScreen() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<StateFilter>('all');
  const [manualExpandedIds, setManualExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(EVERY_PARENT),
  );
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const headerWidth = useMeasuredWidth(headerRef);
  const isNarrow = headerWidth != null && headerWidth <= NARROW_HEADER;
  const bodyRef = useRef<HTMLDivElement>(null);

  /*
   * The pane already has the sidebar, so the rail only fits beside the tree
   * on a wide screen. Below that it moves under the cards.
   */
  const isRailInline = useMediaQuery('(min-width: 1440px)');

  useEffect(() => {
    if (isSearchOpen) {
      searchRef.current?.focus();
    }
  }, [isSearchOpen]);

  /*
   * Collapsing with a query still applied would hide the reason the tree is
   * pruned, so an empty field is the only way back to the button. Bound
   * natively because blur does not bubble and TextInput takes no `onBlur`.
   */
  useEffect(() => {
    const input = searchRef.current;
    if (input == null) {
      return;
    }
    const collapseIfEmpty = () => {
      if (query === '') {
        setIsSearchOpen(false);
      }
    };
    input.addEventListener('blur', collapseIfEmpty);
    return () => input.removeEventListener('blur', collapseIfEmpty);
  }, [query, isSearchOpen]);

  const needle = query.trim().toLowerCase();
  const isFiltering = needle.length > 0 || state !== 'all';

  const data = useMemo(
    () => (isFiltering ? withRollups(pruneTree(ALL_ROWS, needle, state)) : ALL_ROWS),
    [isFiltering, needle, state],
  );

  // While filtering, expansion is derived from the pruned tree so no match can
  // hide behind a collapsed parent; manual state is parked, not overwritten.
  const filterExpandedIds = useMemo(
    () => (isFiltering ? collectIds(data, new Set<string>()) : null),
    [isFiltering, data],
  );
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

  const {visibleData, treeConfig} = useTableTreeState<Row>({
    data,
    idKey: 'id',
    expandedIds,
    onExpandedIdsChange: isFiltering ? () => {} : setManualExpandedIds,
    // Reorders each sibling group in place, so children never leave their
    // parent — this is what keeps sorting and hierarchy compatible.
    sortSiblings: sortable.applySort,
  });

  const setExpanded = useCallback(
    (id: string, shouldExpand: boolean) => {
      if (isFiltering) {
        return;
      }
      setManualExpandedIds(previous => {
        const next = new Set(previous);
        if (shouldExpand) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    [isFiltering],
  );
  const expandRow = useCallback((id: string) => setExpanded(id, true), [setExpanded]);
  const collapseRow = useCallback((id: string) => setExpanded(id, false), [setExpanded]);

  const columns = useMemo(() => buildColumns(isNarrow), [isNarrow]);

  // Focus follows `focusedId`, whether it moved by arrow key or by click, so
  // there is one path to keep the roving tabindex and the DOM in agreement.
  const shouldFocusRef = useRef(false);
  const moveFocus = useCallback((id: string) => {
    shouldFocusRef.current = true;
    setFocusedId(id);
  }, []);

  useEffect(() => {
    if (!shouldFocusRef.current || focusedId == null) {
      return;
    }
    shouldFocusRef.current = false;
    bodyRef.current
      ?.querySelector<HTMLElement>(`tr[data-row-id="${CSS.escape(focusedId)}"]`)
      ?.focus();
  }, [focusedId, visibleData]);

  const tree = useTableTreeData({...treeConfig, hasExpandAllControl: true});
  const sort = useTableSortable<Row>(sortable.sortConfig);
  const resize = useTableColumnResize<Row>({
    columnWidths,
    onColumnResizeEnd: updates => setColumnWidths(previous => ({...previous, ...updates})),
    columns: columns as TableColumn<Record<string, unknown>>[],
  });
  const keyboard = useTreeKeyboardNav({
    rows: visibleData,
    focusedId,
    onFocusedIdChange: moveFocus,
    expandedIds,
    onExpand: expandRow,
    onCollapse: collapseRow,
  });

  const shown = useMemo(
    () => (isFiltering ? countMatches(ALL_ROWS, needle, state) : TOTAL),
    [isFiltering, needle, state],
  );

  const clear = () => {
    setQuery('');
    setState('all');
  };

  return (
    <Layout
      // Inside the manager's frame the pane is as tall as what is left, so the
      // content scrolls in it.
      height="fill"
      contentWidth={1440}
      end={
        !isRailInline ? undefined : (
          <LayoutPanel
            width={296}
            padding={4}
            role="complementary"
            label="About these threads">
            <AboutPanel />
          </LayoutPanel>
        )
      }
      header={
        <Toolbar
          label="Threads"
          size="sm"
          dividers={['bottom']}
          xstyle={styles.headerContainer}
          ref={headerRef}
          startContent={
            <HStack gap={2} vAlign="center">
              <DropdownMenu
                button={{
                  label: STATES.find(s => s.value === state)?.label ?? 'All states',
                  size: 'sm',
                }}
                hasChevron
                items={STATES.map(s => ({label: s.label, onClick: () => setState(s.value)}))}
              />
              <Text type="supporting" color="secondary">
                {shown === TOTAL ? `${TOTAL} threads` : `${shown} of ${TOTAL} threads`}
              </Text>
            </HStack>
          }
          endContent={
            isNarrow && !isSearchOpen ? (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Icon icon={SearchIcon} size="sm" />}
                label="Find a thread"
                onClick={() => setIsSearchOpen(true)}
              />
            ) : (
              <TextInput
                label="Find a thread"
                isLabelHidden
                placeholder="Find a thread"
                startIcon={SearchIcon}
                value={query}
                onChange={setQuery}
                hasClear
                ref={searchRef}
              />
            )
          }
        />
      }
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={6} ref={bodyRef}>
            <Text type="supporting" color="secondary">
              The live threads, and what ended since 22 Nov.
            </Text>
            {data.length === 0 ? (
              <EmptyState
                title="No thread matches"
                description="No thread has that name or task in that state."
                actions={<Button label="Clear" variant="secondary" onClick={clear} />}
              />
            ) : (
              /*
               * The tree reads as one bounded object. `padding={0}` lets rows
               * reach the border so the zebra stripes are full-bleed inside
               * the card, and zeroes the container padding variables that
               * Table's own edge-bleed subtracts from its margins.
               */
              <Card padding={0}>
                <Table<Row>
                  data={visibleData}
                  columns={columns}
                  idKey="id"
                  density="compact"
                  // Rows are separated by tint, not by rule.
                  dividers="none"
                  textOverflow="truncate"
                  plugins={{tree, sort, resize, keyboard}}
                />
              </Card>
            )}
            <PagesPanel />
            {!isRailInline && (
              <>
                <Divider />
                <AboutPanel />
              </>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

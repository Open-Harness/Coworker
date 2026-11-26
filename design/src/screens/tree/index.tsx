// astryx-template: table-tree
'use client';

/**
 * The root manager's page: a tree of managers whose parent rows are derived
 * from the managers beneath them.
 *
 * Rollups are computed from the managers, never stored (`withRollups`), and
 * run again after a filter, because removing managers changes what every
 * parent above them adds up. Sorting composes with the hierarchy: a sort
 * reorders each sibling group in place, and children never leave their parent.
 * Search prunes the tree and force-expands what survives; clearing it restores
 * the expansion the user had before.
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
import {Heading, Text} from '@astryxdesign/core/Text';
import {Button} from '@astryxdesign/core/Button';
import {Banner} from '@astryxdesign/core/Banner';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Icon} from '@astryxdesign/core/Icon';
import {IconButton} from '@astryxdesign/core/IconButton';
import {StatusDot} from '@astryxdesign/core/StatusDot';
import {Toolbar} from '@astryxdesign/core/Toolbar';
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
import {
  ChatBubbleLeftRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {DOT, go} from '../../shell';
import {manager} from '../../world';
import {FilterBar} from './bar';
import {buildColumns} from './columns';
import {useTreeKeyboardNav} from './keyboard';
import {PagesPanel} from './pages';
import {AboutPanel} from './rail';
import {
  ALL_ROWS,
  collectIds,
  countMatches,
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

/** Header width below which the actions and search give up their space. */
const NARROW_HEADER = 720;

/** Reports the observed width of whatever the returned ref is attached to. */
function useMeasuredWidth(
  ref: React.RefObject<HTMLElement | null>,
): number | null {
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

const root = manager('root');
const EVERYONE = collectIds(ALL_ROWS, new Set<string>());
const VERSIONS = ALL_ROWS[0]?.versions ?? 0;
const TOTAL = ALL_ROWS[0]?.count ?? 0;

/** `onNew`, `isMade`: set when Juno works on this page beside a chat. */
export default function RootScreen({onNew, isMade}: {onNew?: () => void; isMade?: boolean} = {}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<StateFilter>('all');
  const [manualExpandedIds, setManualExpandedIds] = useState<
    ReadonlySet<string>
  >(() => new Set(EVERYONE));
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  /*
   * Two regions, two numbers. The header spans the whole page, so it decides
   * whether the actions keep their labels. The filter bar sits in the content
   * column beside the rail and can be far narrower than the page.
   */
  const headerRef = useRef<HTMLDivElement>(null);
  const headerWidth = useMeasuredWidth(headerRef);
  const isNarrowHeader = headerWidth != null && headerWidth <= NARROW_HEADER;

  const bodyRef = useRef<HTMLDivElement>(null);
  const bodyWidth = useMeasuredWidth(bodyRef);
  const isNarrowBody = bodyWidth != null && bodyWidth <= NARROW_HEADER;

  /*
   * The pane already has the sidebar, so the rail only fits beside the tree
   * on a wide screen. Below that it moves under Root's pages.
   */
  const isRailInline = headerWidth != null && headerWidth >= 1100;

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

  // Pruning changes what a parent contains, so the rollups are recomputed
  // from the survivors.
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
      now: (a, b) => a.now.localeCompare(b.now),
      open: (a, b) => a.open - b.open,
      waiting: (a, b) => a.waiting - b.waiting,
      sentBack: (a, b) => a.sentBack - b.sentBack,
      changed: (a, b) => a.changedAt - b.changedAt,
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

  const columns = useMemo(() => buildColumns(isNarrowBody), [isNarrowBody]);

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
    onColumnResizeEnd: updates =>
      setColumnWidths(previous => ({...previous, ...updates})),
    columns: columns as TableColumn<Record<string, unknown>>[],
    /*
     * No global `minWidth` on purpose: it takes precedence over every column's
     * own floor, so each column carries its own instead.
     */
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
      /*
       * `fill` pins the layout to the pane and scrolls the content area
       * internally, which would trap the pages below the fold; `auto` lets
       * the page itself scroll.
       */
      height="auto"
      /*
       * Past this the columns strand their numbers miles from the names.
       * Layout centres each slot inside the cap and leaves dividers
       * full-bleed, so the page keeps its edge-to-edge rules on a wide screen.
       */
      contentWidth={1440}
      end={
        !isRailInline ? undefined : (
          <LayoutPanel
            width={296}
            padding={4}
            role="complementary"
            label="About Juno"
            /*
             * One scroller for the page: the rail travels with the pages
             * rather than holding its own scrollbar next to the page's.
             */
            isScrollable={false}>
            <AboutPanel />
          </LayoutPanel>
        )
      }
      header={
        <Toolbar
          label="Managers"
          size="sm"
          dividers={['bottom']}
          xstyle={styles.headerContainer}
          startContent={
            <HStack gap={3} vAlign="center">
              <Heading level={1}>Managers</Heading>
              <HStack gap={1.5} vAlign="center">
                <StatusDot
                  variant={DOT[root.state].variant}
                  label={DOT[root.state].label}
                />
                {!isNarrowHeader && (
                  <Text type="supporting" color="secondary">
                    {root.now}
                  </Text>
                )}
              </HStack>
            </HStack>
          }
          ref={headerRef}
          endContent={
            isNarrowHeader ? (
              <>
                <IconButton
                  variant="secondary"
                  size="sm"
                  icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />}
                  label="Ask Juno"
                  onClick={() => go('home')}
                />
                <div data-spot="new"><IconButton
                  variant="primary"
                  size="sm"
                  icon={<Icon icon={PlusIcon} size="sm" />}
                  label="New objective"
                  onClick={onNew ?? (() => go('setup'))}
                /></div>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  label="Ask Juno"
                  icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />}
                  onClick={() => go('home')}
                />
                <div data-spot="new"><Button
                  size="sm"
                  variant="primary"
                  label="New objective"
                  icon={<Icon icon={PlusIcon} size="sm" />}
                  onClick={onNew ?? (() => go('setup'))}
                /></div>
              </>
            )
          }
        />
      }
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
              total={TOTAL}
              versions={VERSIONS}
              isNarrow={isNarrowBody}
              isSearchOpen={isSearchOpen}
              onSearchOpen={() => setIsSearchOpen(true)}
            />
            {data.length === 0 ? (
              <EmptyState
                title="No manager matches"
                description="No manager has that name or is doing that, in that state."
                actions={
                  <Button label="Clear" variant="secondary" onClick={clear} />
                }
              />
            ) : (
              /*
               * The tree reads as one bounded object. `padding={0}` matters
               * twice: it lets rows reach the border so the zebra stripes are
               * full-bleed inside the card, and it zeroes the container
               * padding variables that Table's own edge-bleed subtracts from
               * its margins.
               */
              <Card padding={0}>
                <Table<Row>
                  data={visibleData}
                  columns={columns}
                  idKey="id"
                  density="compact"
                  // Rows are separated by tint, not by rule.
                  dividers="none"
                  // Without this a narrowed column wraps mid-word and the row
                  // heights go ragged. It does not reach the tree column,
                  // which wraps by design.
                  textOverflow="truncate"
                  plugins={{tree, sort, resize, keyboard}}
                />
              </Card>
            )}
            {isMade && <div data-spot="made"><Banner status="success" title="Invoices is a manager now" description="It looks for the first time tomorrow at 08:00." /></div>}
            <PagesPanel />
            {/*
              Same panel, different slot: once the layout drops the rail the
              details are not discarded, they stack under the pages the way
              they do on a phone.
            */}
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

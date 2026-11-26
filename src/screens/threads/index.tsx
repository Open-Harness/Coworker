// astryx-template: table-tree
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, Layout, LayoutContent, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { Reading, useClock, useGo, useHref, useRead } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { ThreadsView } from "~/modules/views-manager/types.ts";
import { dayMonth, useZone } from "../manager-frame/words.ts";
import { ManagerFrame } from "../manager-frame/frame.tsx";
import { STATE_LABEL } from "./columns.tsx";
import { countsOf, treeOf, type Row, type StateFilter } from "./model.ts";
import { PagesPanel } from "./pages.tsx";
import { AboutPanel } from "./rail.tsx";
import { useThreadTree } from "./tree.ts";

// Toolbar pads its own contents by 12px, but the table body sits on a 16px content line. The difference is added out here.
const HEADER = { paddingInline: "4px" } as const;
/** Header width below which the search gives up its space. */
const NARROW_HEADER = 720;

const STATES: ReadonlyArray<{ value: StateFilter; label: string }> = [
  { value: "all", label: "All states" },
  { value: "working", label: STATE_LABEL.working },
  { value: "needs-you", label: STATE_LABEL["needs-you"] },
  { value: "done", label: STATE_LABEL.done },
];

/** Reports the observed width of whatever the returned ref is attached to. Null until measured, so the first paint is no guess. */
function useMeasuredWidth(ref: React.RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element == null) return;
    const observer = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? null));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * A manager's threads: every thread is a fork, so they form a tree. The roots are the conversations the manager holds; a parent
 * row counts what is beneath it, run again after a filter. Sorting reorders each sibling group in place, and search prunes the tree
 * and force-expands what survives.
 */
function Threads({ view, manager, name }: { readonly view: ThreadsView; readonly manager: string; readonly name: string }) {
  const [clock, zone, go, href] = [useClock(), useZone(), useGo(), useHref()];
  const all = useMemo(() => treeOf(view, { clock, zone, manager: name }), [view, clock, zone, name]);
  const counts = useMemo(() => countsOf(all), [all]);
  const total = counts.shown;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const headerWidth = useMeasuredWidth(headerRef);
  const isNarrow = headerWidth != null && headerWidth <= NARROW_HEADER;
  const { query, setQuery, state, setState, data, shown, plugins, bodyRef, visibleData, columns } = useThreadTree({
    all,
    manager,
    href,
    go,
    isNarrow,
  });
  // The pane already has the sidebar, so the rail only fits beside the tree on a wide screen. Below that it moves under the cards.
  const isRailInline = useMediaQuery("(min-width: 1440px)");

  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);
  // Collapsing with a query still applied would hide the reason the tree is pruned, so an empty field is the only way back to the
  // button. Bound natively because blur does not bubble and TextInput takes no `onBlur`.
  useEffect(() => {
    const input = searchRef.current;
    if (input == null) return;
    const collapseIfEmpty = () => {
      if (query === "") setIsSearchOpen(false);
    };
    input.addEventListener("blur", collapseIfEmpty);
    return () => input.removeEventListener("blur", collapseIfEmpty);
  }, [query, isSearchOpen]);

  const clear = () => {
    setQuery("");
    setState("all");
  };
  const since = view.rows.reduce((first, one) => Math.min(first, one.started), clock.now());
  const rail = (
    <AboutPanel
      manager={manager}
      name={name}
      counts={counts}
      ended7={view.ended7}
      cost7={view.cost7}
      shownCost={all.reduce((sum, one) => sum + one.beneathCost, 0)}
    />
  );
  return (
    <Layout
      // Inside the manager's frame the pane is as tall as what is left, so the content scrolls in it.
      height="fill"
      contentWidth={1440}
      end={
        !isRailInline ? undefined : (
          <LayoutPanel width={296} padding={4} role="complementary" label="About these threads">
            {rail}
          </LayoutPanel>
        )
      }
      header={
        <Toolbar
          label="Threads"
          size="sm"
          dividers={["bottom"]}
          style={HEADER}
          ref={headerRef}
          startContent={
            <HStack gap={2} vAlign="center">
              <DropdownMenu
                button={{ label: STATES.find((one) => one.value === state)?.label ?? "All states", size: "sm" }}
                hasChevron
                items={STATES.map((one) => ({ label: one.label, onClick: () => setState(one.value) }))}
              />
              <Text type="supporting" color="secondary">
                {shown === total ? `${total} threads` : `${shown} of ${total} threads`}
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
            <Text type="supporting" color="secondary">{`The live threads, and what ended since ${dayMonth(since, zone)}.`}</Text>
            {data.length === 0 ? (
              <EmptyState
                title="No thread matches"
                description="No thread has that name or task in that state."
                actions={<Button label="Clear" variant="secondary" onClick={clear} />}
              />
            ) : (
              // The tree reads as one bounded object. `padding={0}` lets rows reach the border so the stripes are full-bleed inside the card.
              <Card padding={0}>
                <Table<Row>
                  data={visibleData}
                  columns={columns}
                  idKey="id"
                  density="compact"
                  // Rows are separated by tint, not by rule.
                  dividers="none"
                  textOverflow="truncate"
                  plugins={plugins}
                />
              </Card>
            )}
            <PagesPanel name={name} limits={view.limits} />
            {!isRailInline && (
              <>
                <Divider />
                {rail}
              </>
            )}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

export default function ThreadsPage({ params }: PageProps) {
  const manager = params["manager"] ?? "";
  const shell = useRead("/shell");
  const name = shell._tag === "Ok" ? (shell.value.tree.find((one) => one.id === manager)?.name ?? manager) : manager;
  return (
    <ManagerFrame id={manager} tab="Threads">
      <Reading
        from="/m/:manager/threads"
        parts={params}
        failed="We could not read the threads"
        gone={{ title: "This manager is not here" }}
      >
        {(view) => <Threads view={view} manager={manager} name={name} />}
      </Reading>
    </ManagerFrame>
  );
}

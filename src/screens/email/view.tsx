// astryx-template: table-inbox
import { useCallback, useMemo, useState } from "react";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { ResizeHandle } from "@astryxdesign/core/Resizable";
import { useContainerReveal, useMediaQuery } from "@astryxdesign/core/hooks";
import { Table, useTableRowStatus, useTableSelection, useTableSelectionState } from "@astryxdesign/core/Table";
import type { TablePlugin } from "@astryxdesign/core/Table";
import { InboxIcon } from "@heroicons/react/24/outline";
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { MailView } from "~/modules/views-connector/types.ts";
import { rowOf } from "./adapt.ts";
import { useColumns } from "./columns.tsx";
import { countsByCategory, inCategory, matches, type Category, type Conversation, type Standing } from "./data.ts";
import { BulkBand, Tabs, ToolbarRow } from "./header.tsx";
import { OpenConversation } from "./open.tsx";
import { usePlacedPane } from "./placed.ts";
import type { Act } from "./row-actions.ts";
import { ALIGN_STATUS_GUTTER, useInboxRows } from "./rows.tsx";
import { SINGLE_SURFACE_BELOW, STACK_ROWS_BELOW, TIGHTEN_COLUMNS_BELOW, useSurfaceWidth } from "./surface.ts";

interface Edit {
  readonly isUnread?: boolean;
  readonly category?: Standing;
}

/** The mail the people writing in see: the list of conversations, and the one you have open. */
function Mail({
  manager,
  view,
  who,
  zone,
}: {
  readonly manager: string;
  readonly view: MailView;
  readonly who: string;
  readonly zone: string;
}) {
  const clock = useClock();
  // Whether a conversation is read or done is the page's own: the console only knows who waits for whom.
  const [edits, setEdits] = useState<Readonly<Record<string, Edit>>>({});
  const [category, setCategory] = useState<Category>("inbox");
  const [query, setQuery] = useState("");
  // Three states, because "nothing chosen yet" falls through to the top of the list while a close has to stay closed.
  const [chosenId, setChosenId] = useState<string | null | undefined>(undefined);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());

  const all = useMemo(
    (): Conversation[] => view.conversations.map((c) => ({ ...rowOf(c, clock, []), ...edits[c.id] })),
    [view, clock, edits],
  );
  const visible = useMemo(() => all.filter((item) => inCategory(item, category) && matches(item, query)), [all, category, query]);
  const counts = useMemo(() => countsByCategory(all), [all]);

  const { selectionConfig } = useTableSelectionState<Conversation>({ data: visible, idKey: "id", selectedKeys, setSelectedKeys });
  const reveal = useContainerReveal();
  const [surfaceRef, surfaceWidth] = useSurfaceWidth();
  const isMeasured = surfaceWidth > 0;
  const isSingleSurface = isMeasured && surfaceWidth < SINGLE_SURFACE_BELOW;

  // The first conversation is open by default, unless the surface is a phone's. An explicit close wins over the default.
  const defaultOpenId = isSingleSurface ? null : (visible[0]?.id ?? null);
  const openId =
    chosenId === null ? null : chosenId !== undefined && visible.some((item) => item.id === chosenId) ? chosenId : defaultOpenId;
  const openConversation = visible.find((item) => item.id === openId) ?? null;
  const isPaneFullWidth = isSingleSurface && openId != null;

  const apply = useCallback(
    (ids: ReadonlySet<string> | string, edit: (c: Conversation) => Edit) => {
      setEdits((was) => {
        const next: Record<string, Edit> = { ...was };
        for (const id of typeof ids === "string" ? [ids] : ids) {
          const c = all.find((x) => x.id === id);
          if (c !== undefined) next[id] = { ...was[id], ...edit(c) };
        }
        return next;
      });
    },
    [all],
  );
  const act: Act = useCallback(
    (what, ids) => {
      if (what === "done") return apply(ids, () => ({ category: "done" }));
      const first = typeof ids === "string" ? ids : [...ids][0];
      const makeRead = all.find((c) => c.id === first)?.isUnread ?? false;
      apply(ids, () => ({ isUnread: !makeRead }));
    },
    [all, apply],
  );

  const pane = usePlacedPane(surfaceWidth);
  // Whether the rows stack is a question about the table itself, so the table's own width is what gets asked.
  const [listRef, listWidth] = useSurfaceWidth();
  const isListMeasured = listWidth > 0;
  const isStacked = isListMeasured && listWidth < STACK_ROWS_BELOW;
  const isTight = isListMeasured && listWidth < TIGHTEN_COLUMNS_BELOW;
  // Touch never hovers, so the actions are shown permanently there. `hover`, not `any-pointer`: a laptop with a touchscreen still has a mouse.
  const isTouch = useMediaQuery("(hover: none)");

  const handleOpen = useCallback(
    (item: Conversation) => {
      setChosenId(item.id);
      apply(item.id, () => ({ isUnread: false }));
    },
    [apply],
  );
  const rowStatus = useTableRowStatus<Conversation>({
    getStatus: useCallback((item: Conversation) => (item.isUnread ? { color: "accent" as const, label: "Unread" } : null), []),
  });
  const selection = useTableSelection<Conversation>({
    ...selectionConfig,
    getRowLabel: (item) => `conversation from ${item.sender}`,
    hasRowHighlight: false,
  });
  const rows = useInboxRows({ openId, onOpen: handleOpen, getContainerProps: reveal.getContainerProps });
  const columns = useColumns({ isStacked, isTight, isTouch, reveal, onAct: act });

  // Stacked, the checkbox column goes: bulk selection is not what a narrow surface is for.
  const tablePlugins: Record<string, TablePlugin<Conversation>> = isStacked
    ? { rowStatus, rows, gutter: ALIGN_STATUS_GUTTER }
    : { selection, rowStatus, rows, gutter: ALIGN_STATUS_GUTTER };
  // Counted against what is on screen, so ticks made in one tab are not armed in another.
  const selected = new Set(visible.filter((item) => selectedKeys.has(item.id)).map((item) => item.id));
  const hasSelection = selected.size > 0 && !isStacked;
  const unread = all.filter((item) => item.isUnread).length;

  const opened = (isFullWidth: boolean) =>
    openConversation === null ? null : (
      <OpenConversation
        manager={manager}
        who={who}
        zone={zone}
        conversation={openConversation}
        onClose={() => setChosenId(null)}
        isFullWidth={isFullWidth}
        act={act}
      />
    );

  return (
    <Layout
      ref={surfaceRef}
      height="fill"
      aria-label={`${who}: email`}
      header={
        <LayoutHeader hasDivider={isPaneFullWidth} padding={0}>
          <VStack gap={0}>
            {isPaneFullWidth ? null : <ToolbarRow query={query} onQuery={setQuery} unread={unread} total={all.length} />}
            {isPaneFullWidth ? null : hasSelection ? (
              <BulkBand
                count={selected.size}
                onRead={() => {
                  apply(selected, () => ({ isUnread: false }));
                  setSelectedKeys(new Set());
                }}
                onDone={() => {
                  apply(selected, () => ({ category: "done" }));
                  setSelectedKeys(new Set());
                }}
                onClear={() => setSelectedKeys(new Set())}
              />
            ) : (
              <Tabs value={category} onChange={setCategory} counts={counts} />
            )}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" ref={listRef} padding={4} isScrollable>
          {isPaneFullWidth && openConversation != null ? (
            opened(true)
          ) : visible.length === 0 ? (
            <VStack padding={6}>
              <EmptyState
                title="Nothing here"
                description={query.trim() === "" ? "No conversations in this tab." : "No conversation matches your search."}
                icon={<Icon icon={InboxIcon} size="lg" />}
                actions={
                  <Button
                    label={query.trim() === "" ? "Go to Inbox" : "Clear search"}
                    variant="secondary"
                    onClick={() => (query.trim() === "" ? setCategory("inbox") : setQuery(""))}
                  />
                }
              />
            </VStack>
          ) : (
            // Key order is not pipeline order: Table puts the selection checkbox first and the unread dot outside it, at the left edge.
            <Table
              data={visible}
              columns={columns}
              idKey="id"
              plugins={tablePlugins}
              density="balanced"
              dividers="none"
              hasHover
              textOverflow="truncate"
            />
          )}
        </LayoutContent>
      }
      end={
        isSingleSurface || openConversation == null ? undefined : (
          <>
            {/* The handle comes before the panel: the boundary it drags is the panel's inline-start edge, hence `isReversed`. */}
            <ResizeHandle
              direction="horizontal"
              isReversed
              hasDivider
              pillPlacement="end"
              resizable={pane.props}
              label="Resize conversation pane"
            />
            <LayoutPanel resizable={pane.props} padding={0} role="complementary" label="Conversation">
              {opened(false)}
            </LayoutPanel>
          </>
        )
      }
    />
  );
}

export default function EmailView({ manager }: { readonly manager: string }) {
  const shell = useRead("/shell");
  if (shell._tag !== "Ok") return null;
  const { coworker, workspace } = shell.value;
  return (
    <Reading from="/m/:manager/connectors/email" parts={{ manager }} failed="We could not read this mailbox">
      {(view) => <Mail manager={manager} view={view} who={coworker.name} zone={workspace.zone} />}
    </Reading>
  );
}

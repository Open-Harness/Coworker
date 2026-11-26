// astryx-template: table-inbox
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { useContainerReveal, useMediaQuery } from "@astryxdesign/core/hooks";
import { Table, useTableRowStatus, useTableSelection, useTableSelectionState } from "@astryxdesign/core/Table";
import type { TablePlugin } from "@astryxdesign/core/Table";
import { InboxIcon } from "@heroicons/react/24/outline";
import { manager } from "../../world";
import { useColumns } from "./columns";
import { countsByCategory, inCategory, matches, type Category, type Conversation } from "./data";
import { BulkBand, Tabs, ToolbarRow } from "./header";
import { MAILS } from "./mails";
import { ConversationPane } from "./pane";
import type { Act } from "./row-actions";
import { ALIGN_STATUS_GUTTER, useInboxRows } from "./rows";
import * as edit from "./state";
import { LIST_MIN_WIDTH, PANE_DEFAULT_SHARE, PANE_MIN_WIDTH, SINGLE_SURFACE_BELOW, STACK_ROWS_BELOW, TIGHTEN_COLUMNS_BELOW, useSurfaceWidth } from "./surface";

/** Support's mail, as the people writing in see it: the list of conversations, and the one you have open. */
export default function EmailScreen({ manager: id }: { manager: string }) {
  const name = "Juno";
  const [all, setAll] = useState<Conversation[]>(MAILS);
  const [category, setCategory] = useState<Category>("inbox");
  const [query, setQuery] = useState("");
  // Three states, because "nothing chosen yet" falls through to the top of the list while a close has to stay closed.
  const [chosenId, setChosenId] = useState<string | null | undefined>(undefined);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());

  const visible = useMemo(() => all.filter((item) => inCategory(item, category) && matches(item, query)), [all, category, query]);
  const counts = useMemo(() => countsByCategory(all), [all]);

  const { selectionConfig } = useTableSelectionState<Conversation>({ data: visible, idKey: "id", selectedKeys, setSelectedKeys });
  const reveal = useContainerReveal();
  const [surfaceRef, surfaceWidth] = useSurfaceWidth();
  const isMeasured = surfaceWidth > 0;
  const isSingleSurface = isMeasured && surfaceWidth < SINGLE_SURFACE_BELOW;

  // The first conversation is open by default, unless the surface is a phone's. An explicit close wins over the default.
  const defaultOpenId = isSingleSurface ? null : (visible[0]?.id ?? null);
  const openId = chosenId === null ? null : chosenId !== undefined && visible.some((item) => item.id === chosenId) ? chosenId : defaultOpenId;
  const openConversation = visible.find((item) => item.id === openId) ?? null;
  const isPaneFullWidth = isSingleSurface && openId != null;

  // Every change goes through one place.
  const apply = useCallback((ids: ReadonlySet<string> | string, f: (c: Conversation) => Conversation) => setAll((list) => edit.change(list, ids, f)), []);
  const act: Act = useCallback((what, ids) => {
    if (what === "done") return apply(ids, edit.markDone);
    const first = typeof ids === "string" ? ids : [...ids][0];
    const makeRead = all.find((c) => c.id === first)?.isUnread ?? false;
    apply(ids, edit.setUnread(!makeRead));
  }, [all, apply]);

  const hasUserMovedPane = useRef(false);
  const isPlacingPane = useRef(false);
  const onPaneSizeChange = useCallback(() => { if (!isPlacingPane.current) hasUserMovedPane.current = true; }, []);
  const pane = useResizable({
    defaultSize: "58%", minSize: PANE_MIN_WIDTH,
    maxSize: isMeasured ? Math.max(PANE_MIN_WIDTH, surfaceWidth - LIST_MIN_WIDTH) : undefined,
    onSizeChange: onPaneSizeChange,
  });
  // Land the pane on its share of the surface, and keep it there until the handle is used.
  const { resize: resizePane } = pane;
  useLayoutEffect(() => {
    if (hasUserMovedPane.current || !isMeasured) return;
    isPlacingPane.current = true;
    resizePane(Math.round(surfaceWidth * PANE_DEFAULT_SHARE));
    isPlacingPane.current = false;
  }, [isMeasured, surfaceWidth, resizePane]);

  // Whether the rows stack is a question about the table itself, so the table's own width is what gets asked.
  const [listRef, listWidth] = useSurfaceWidth();
  const isListMeasured = listWidth > 0;
  const isStacked = isListMeasured && listWidth < STACK_ROWS_BELOW;
  const isTight = isListMeasured && listWidth < TIGHTEN_COLUMNS_BELOW;
  // Touch never hovers, so the actions are shown permanently there. `hover`, not `any-pointer`: a laptop with a touchscreen still has a mouse.
  const isTouch = useMediaQuery("(hover: none)");

  const handleOpen = useCallback((item: Conversation) => { setChosenId(item.id); apply(item.id, edit.setUnread(false)); }, [apply]);
  const rowStatus = useTableRowStatus<Conversation>({ getStatus: useCallback((item: Conversation) => (item.isUnread ? { color: "accent" as const, label: "Unread" } : null), []) });
  const selection = useTableSelection<Conversation>({ ...selectionConfig, getRowLabel: (item) => `conversation from ${item.sender}`, hasRowHighlight: false });
  const rows = useInboxRows({ openId, onOpen: handleOpen, getContainerProps: reveal.getContainerProps });
  const columns = useColumns({ isStacked, isTight, isTouch, reveal, onAct: act });

  // Stacked, the checkbox column goes: bulk selection is not what a narrow surface is for.
  const tablePlugins: Record<string, TablePlugin<Conversation>> = isStacked ? { rowStatus, rows, gutter: ALIGN_STATUS_GUTTER } : { selection, rowStatus, rows, gutter: ALIGN_STATUS_GUTTER };
  // Counted against what is on screen, so ticks made in one tab are not armed in another.
  const selected = new Set(visible.filter((item) => selectedKeys.has(item.id)).map((item) => item.id));
  const hasSelection = selected.size > 0 && !isStacked;
  const unread = all.filter((item) => item.isUnread).length;

  const paneProps = {
    act,
    onTell: (cid: string, text: string) => apply(cid, edit.tell(text)),
    onWrite: (cid: string, text: string) => apply(cid, edit.write(text)),
    onHandBack: (cid: string) => apply(cid, edit.handBack),
    onChangeDraft: (cid: string, d: string, text: string) => apply(cid, edit.changeDraft(d, text)),
    onSendDraft: (cid: string, d: string) => apply(cid, edit.sendDraft(d)),
  };

  return (
    <Layout
      ref={surfaceRef}
      height="fill"
      aria-label={`${name}: email`}
      header={
        <LayoutHeader hasDivider={isPaneFullWidth} padding={0}>
          <VStack gap={0}>
            {isPaneFullWidth ? null : <ToolbarRow query={query} onQuery={setQuery} unread={unread} total={all.length} />}
            {isPaneFullWidth ? null : hasSelection
              ? <BulkBand count={selected.size} onRead={() => { apply(selected, edit.setUnread(false)); setSelectedKeys(new Set()); }} onDone={() => { apply(selected, edit.markDone); setSelectedKeys(new Set()); }} onClear={() => setSelectedKeys(new Set())} />
              : <Tabs value={category} onChange={setCategory} counts={counts} />}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" ref={listRef} padding={4} isScrollable>
          {isPaneFullWidth && openConversation != null ? (
            <ConversationPane conversation={openConversation} onClose={() => setChosenId(null)} isFullWidth {...paneProps} />
          ) : visible.length === 0 ? (
            <VStack padding={6}>
              <EmptyState
                title="Nothing here"
                description={query.trim() === "" ? "No conversations in this tab." : "No conversation matches your search."}
                icon={<Icon icon={InboxIcon} size="lg" />}
                actions={<Button label={query.trim() === "" ? "Go to Inbox" : "Clear search"} variant="secondary" onClick={() => (query.trim() === "" ? setCategory("inbox") : setQuery(""))} />}
              />
            </VStack>
          ) : (
            // Key order is not pipeline order: Table puts the selection checkbox first and the unread dot outside it, at the left edge.
            <Table data={visible} columns={columns} idKey="id" plugins={tablePlugins} density="balanced" dividers="none" hasHover textOverflow="truncate" />
          )}
        </LayoutContent>
      }
      end={
        isSingleSurface || openConversation == null ? undefined : (
          <>
            {/* The handle comes before the panel: the boundary it drags is the panel's inline-start edge, hence `isReversed`. */}
            <ResizeHandle direction="horizontal" isReversed hasDivider pillPlacement="end" resizable={pane.props} label="Resize conversation pane" />
            <LayoutPanel resizable={pane.props} padding={0} role="complementary" label="Conversation">
              <ConversationPane conversation={openConversation} onClose={() => setChosenId(null)} isFullWidth={false} {...paneProps} />
            </LayoutPanel>
          </>
        )
      }
    />
  );
}

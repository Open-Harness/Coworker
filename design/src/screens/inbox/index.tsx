// astryx-template: table-inbox
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { ResizeHandle, useResizable } from "@astryxdesign/core/Resizable";
import { Table, useTableRowStatus } from "@astryxdesign/core/Table";
import type { TablePlugin } from "@astryxdesign/core/Table";
import { useToast } from "@astryxdesign/core/Toast";
import { InboxIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import { useColumns } from "./columns";
import { countsByStanding, statusLine, type Item, type Option, type Standing } from "./data";
import { Tabs, TitleRow } from "./header";
import { ITEMS } from "./items";
import { ItemPane } from "./pane";
import { ALIGN_STATUS_GUTTER, useInboxRows } from "./rows";
import * as edit from "./state";
import { LIST_MIN_WIDTH, PANE_DEFAULT_SHARE, PANE_MIN_WIDTH, SINGLE_SURFACE_BELOW, STACK_ROWS_BELOW, TIGHTEN_COLUMNS_BELOW, useSurfaceWidth } from "./surface";

const EMPTY: Record<Standing, { title: string; description: string }> = {
  ask: { title: "Nothing waits for you", description: "When a manager needs an answer from you, it shows here." },
  wait: { title: "Nothing waits for others", description: "What a manager waits for from someone else shows here." },
  know: { title: "Nothing new to know", description: "Changes, answers and results show here." },
  done: { title: "Nothing done yet", description: "What you answered shows here." },
};
const YELLOW = "yellow", BLUE = "var(--color-data-categorical-blue)";

/** What waits for Ama from any manager: the list of items, and the one you have open. */
export default function InboxScreen() {
  const showToast = useToast();
  const [all, setAll] = useState<Item[]>(ITEMS);
  const [standing, setStanding] = useState<Standing>("ask");
  // Three states, because "nothing chosen yet" falls through to the top of the list while a close has to stay closed.
  const [chosenId, setChosenId] = useState<string | null | undefined>(undefined);

  const visible = useMemo(() => all.filter((item) => item.standing === standing), [all, standing]);
  const counts = useMemo(() => countsByStanding(all), [all]);

  const [surfaceRef, surfaceWidth] = useSurfaceWidth();
  const isMeasured = surfaceWidth > 0;
  const isSingleSurface = isMeasured && surfaceWidth < SINGLE_SURFACE_BELOW;

  // The first item is open by default, unless the surface is a phone's. An explicit close wins over the default.
  const defaultOpenId = isSingleSurface ? null : (visible[0]?.id ?? null);
  const openId = chosenId === null ? null : chosenId !== undefined && visible.some((item) => item.id === chosenId) ? chosenId : defaultOpenId;
  const openItem = visible.find((item) => item.id === openId) ?? null;
  const isPaneFullWidth = isSingleSurface && openId != null;

  const handleOpen = useCallback((item: Item) => { setChosenId(item.id); setAll((list) => edit.change(list, item.id, edit.seen)); }, []);
  // Answering takes the item out of this tab, and the next one comes up on its own, so a queue can be cleared from the top.
  const onAnswer = useCallback((option: Option) => {
    if (!openItem) return;
    if (option.go) { go(option.go); return; }
    setAll((list) => edit.change(list, openItem.id, edit.answer(option)));
    if (!option.keeps) setChosenId(undefined);
    showToast({ body: option.told, uniqueID: `answered-${openItem.id}-${option.id}` });
  }, [openItem, showToast]);

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

  // The dot says what the row needs: yellow, it waits for you; blue, it is new. Nothing else has one.
  const rowStatus = useTableRowStatus<Item>({
    getStatus: useCallback((item: Item) => (item.standing === "ask" ? { color: YELLOW, label: "Waits for you" } : item.standing === "know" && item.isNew ? { color: BLUE, label: "New" } : null), []),
  });
  const rows = useInboxRows({ openId, onOpen: handleOpen });
  const columns = useColumns({ isStacked, isTight });
  const tablePlugins: Record<string, TablePlugin<Item>> = { rowStatus, rows, gutter: ALIGN_STATUS_GUTTER };

  return (
    <Layout
      ref={surfaceRef}
      height="fill"
      aria-label="Inbox"
      header={
        <LayoutHeader hasDivider={isPaneFullWidth} padding={0}>
          <VStack gap={0}>
            {isPaneFullWidth ? null : (
              <>
                <TitleRow status={statusLine(counts)} onRefresh={() => showToast({ body: "Nothing new since 09:54.", uniqueID: "refresh" })} onAsk={() => go("home")} />
                <Tabs value={standing} onChange={(s) => { setStanding(s); setChosenId(undefined); }} counts={counts} isShort={isSingleSurface && surfaceWidth < 480} />
              </>
            )}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" ref={listRef} padding={4} isScrollable>
          {isPaneFullWidth && openItem != null ? (
            <ItemPane item={openItem} onClose={() => setChosenId(null)} isFullWidth onAnswer={onAnswer} />
          ) : visible.length === 0 ? (
            <VStack padding={6}>
              <EmptyState title={EMPTY[standing].title} description={EMPTY[standing].description} icon={<Icon icon={InboxIcon} size="lg" />}
                actions={standing === "ask" ? undefined : <Button label="Go to what waits for you" variant="secondary" onClick={() => setStanding("ask")} />} />
            </VStack>
          ) : (
            <Table data={visible} columns={columns} idKey="id" plugins={tablePlugins} density="balanced" dividers="none" hasHover textOverflow="truncate" />
          )}
        </LayoutContent>
      }
      end={
        isSingleSurface || openItem == null ? undefined : (
          <>
            {/* The handle comes before the panel: the boundary it drags is the panel's inline-start edge, hence `isReversed`. */}
            <ResizeHandle direction="horizontal" isReversed hasDivider pillPlacement="end" resizable={pane.props} label="Resize item pane" />
            <LayoutPanel resizable={pane.props} padding={0} role="complementary" label="Item">
              <ItemPane item={openItem} onClose={() => setChosenId(null)} isFullWidth={false} onAnswer={onAnswer} />
            </LayoutPanel>
          </>
        )
      }
    />
  );
}

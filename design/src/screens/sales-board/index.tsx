// astryx-template: kanban-board
import type { ReactNode } from "react";
import { Layout, LayoutHeader, LayoutContent, HStack, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Icon } from "@astryxdesign/core/Icon";
import { Selector } from "@astryxdesign/core/Selector";
import { Divider } from "@astryxdesign/core/Divider";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { useToast } from "@astryxdesign/core/Toast";
import { Section } from "@astryxdesign/core/Section";
import { PlusIcon, MagnifyingGlassIcon, ArrowsUpDownIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { BoardCard, BoardCardBody, BoardColumn } from "./card";
import { COLUMNS, OPEN_TOTAL, WAIT_BO, WAIT_CUSTOMER, stepName, type ColumnId } from "./data";
import { styles } from "./styles";
import { useBoardDrag } from "./use-board-drag";

const VIEWS = [{ value: "Kanban", label: "Kanban" }, { value: "List", label: "List" }, { value: "Console", label: "Console" }];

/** Sales' board: its workflow's steps are the columns, as Coding's are. The manager's name and tabs are above it already. */
export default function SalesBoardScreen() {
  const showToast = useToast();
  const { items, itemsByColumn, drag, moveItem, getColumnRef, getCardRef, onCardPointerDown, isColumnEmpty } = useBoardDrag((item, to) =>
    showToast({ body: `Sales is told: ${item.id} moved from ${stepName(item.step)} to ${stepName(to)}.`, uniqueID: `moved-${item.id}` }),
  );
  const soon = (what: string) => () => showToast({ body: `${what} is not in this first set.`, uniqueID: what });
  const draggedItem = drag ? items.find((it) => it.id === drag.id) : undefined;

  // Card nodes for a column. A ghost box marks the landing slot during a drag.
  // The carried card stays mounted, hidden, in its own column: a touch's moves
  // go to the element the touch started on, so removing it would end the carry.
  const renderColumnCards = (colId: ColumnId): ReactNode => {
    const colItems = itemsByColumn[colId];
    const visible = drag ? colItems.filter((it) => it.id !== drag.id) : colItems;
    const carried = drag ? colItems.find((it) => it.id === drag.id) : undefined;
    const ghostTarget = drag && drag.target && drag.target.column === colId ? drag : null;
    if (visible.length === 0 && !ghostTarget && !carried) return null;

    const card = (it: (typeof items)[number], isCarried = false) => (
      <BoardCard key={it.id} item={it} cardRef={getCardRef(it.id)} onPointerDown={onCardPointerDown} onMove={moveItem} isCarried={isCarried} />
    );
    const nodes: ReactNode[] = visible.map((it) => card(it));
    if (ghostTarget && ghostTarget.target) {
      nodes.splice(Math.min(ghostTarget.target.index, nodes.length), 0, <VStack key="drag-ghost" xstyle={styles.ghost(ghostTarget.height)} />);
    }
    if (carried) nodes.push(card(carried, true));
    return nodes;
  };

  return (
    <Section height="100%">
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider padding={4}>
            <Toolbar
              label="Board actions"
              gap={2}
              startContent={
                <>
                  <Heading level={3} accessibilityLevel={1}>Open work</Heading>
                  <Badge label={OPEN_TOTAL} variant="neutral" />
                  <Text type="supporting" color="secondary">{WAIT_CUSTOMER} wait for the customer, {WAIT_BO} waits for Bo</Text>
                </>
              }
              endContent={
                <HStack gap={2} wrap="wrap">
                  <Selector
                    label="View"
                    width={160}
                    isLabelHidden
                    value="Kanban"
                    onChange={(v) => { if (v !== "Kanban") soon(`The ${v.toLowerCase()}`)(); }}
                    options={VIEWS}
                  />
                  <Divider variant="strong" orientation="vertical" xstyle={styles.toolbarDivider} />
                  <HStack gap={1} vAlign="center">
                    <IconButton icon={<Icon icon={ArrowsUpDownIcon} size="sm" />} label="Sort" onClick={soon("Sorting")} />
                    <IconButton icon={<Icon icon={FunnelIcon} size="sm" />} label="Filter" onClick={soon("Filtering")} />
                    <IconButton icon={<Icon icon={MagnifyingGlassIcon} size="sm" />} label="Search" onClick={soon("Search")} />
                  </HStack>
                  <Button label="Add work" variant="primary" icon={<Icon icon={PlusIcon} size="sm" />} onClick={soon("Adding work by hand")} />
                </HStack>
              }
            />
          </LayoutHeader>
        }
        content={
          <LayoutContent role="main" padding={0}>
            <HStack gap={3} xstyle={styles.boardColumns}>
              {COLUMNS.map((meta) => (
                <BoardColumn key={meta.id} meta={meta} count={itemsByColumn[meta.id].length + meta.more} contentRef={getColumnRef(meta.id)} isEmpty={isColumnEmpty(meta.id)}
                  onMore={soon("The list")}>
                  {renderColumnCards(meta.id)}
                </BoardColumn>
              ))}
            </HStack>
          </LayoutContent>
        }
      />
      {drag && draggedItem ? (
        <Card padding={3} xstyle={[styles.floating, styles.floatingAt(drag.pointerX - drag.offsetX, drag.pointerY - drag.offsetY, drag.width)]}>
          <BoardCardBody item={draggedItem} onMove={() => {}} />
        </Card>
      ) : null}
    </Section>
  );
}

import { useMemo } from "react";
import { HStack, StackItem } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import type { UseContainerRevealReturn } from "@astryxdesign/core/hooks";
import { pixel } from "@astryxdesign/core/Table";
import type { TablePlugin } from "@astryxdesign/core/Table";
import { PaperClipIcon as AttachIcon } from "@heroicons/react/24/outline";
import type { Conversation } from "./data";
import { actionsFor, type Act } from "./row-actions";

/** Dwell before the row actions appear, so a cursor travelling down the list does not light up every row. */
export const HOVER_INTENT_MS = 90;
/** Matches the wash the selection plugin paints, so both states look native. */
const OPEN_CELL_STYLE = { backgroundColor: "var(--color-accent-muted)" };

/** Controls that live inside the row but are not the row: the row opens the conversation, they do not. */
const INTERACTIVE_WITHIN_ROW = 'button, input, a, label, dialog, [role="checkbox"], [role="button"], [role="menuitem"]';

function isRowItself(event: { target: EventTarget | null; currentTarget: EventTarget | null }): boolean {
  const control = (event.target as HTMLElement | null)?.closest(INTERACTIVE_WITHIN_ROW);
  const row = event.currentTarget as HTMLElement;
  return !control || control === row || !row.contains(control);
}

/** A `size="sm"` IconButton is 28px; `gap={0.5}` is 2px. */
const actionsWidth = (count: number) => count * 28 + (count - 1) * 2;
/** `density="balanced"` insets a table cell by 12px on each inline edge. */
const CELL_INSET = 24;
/** Room for "Yesterday", plus the attachment clip and its gap. Paid on every row so the date column stays straight. */
const TIMESTAMP_WIDTH = 76 + 16 + 4;

/** How wide the trailing column has to be: overlaid, whichever of actions and time is wider; side by side, both. */
export function trailingWidth(isSideBySide: boolean): number {
  const actions = actionsWidth(2);
  return isSideBySide ? actions + 4 + TIMESTAMP_WIDTH + CELL_INSET : Math.max(actions, TIMESTAMP_WIDTH) + CELL_INSET;
}

/** The actions take the whole cell the moment they enter flow, which is what leaves the time with nowhere to be. */
const ACTIONS_CLAIM_CELL = { flexBasis: "100%", flexShrink: 0 };
/** Clips whatever the actions squeeze out of the trailing box, the attachment clip included. */
const HIDE_SQUEEZED_CONTENT = { overflow: "hidden" };

/** The status gutter's width, so the unread dot lands on the content line. */
const STATUS_GUTTER_WIDTH = 36;
const STATUS_COLUMN_KEY = "__rowStatus";
export const ALIGN_STATUS_GUTTER: TablePlugin<Conversation> = {
  transformColumns: (columns) => columns.map((column) => (column.key === STATUS_COLUMN_KEY ? { ...column, width: pixel(STATUS_GUTTER_WIDTH) } : column)),
};

/**
 * The time, and the actions that take its place on hover. Both visibilities come from `useContainerReveal`, the row is the container,
 * so nothing here is React state and hovering re-renders nothing. The time is displaced, not hidden, by the same rule that puts the actions in flow.
 */
export function ReceivedCell({ item, reveal, isOverlaid, onAct }: { item: Conversation; reveal: UseContainerRevealReturn; isOverlaid: boolean; onAct: Act }) {
  return (
    <HStack gap={1} vAlign="center" hAlign="end" height={28}>
      <HStack {...reveal.getContentRevealProps()} style={isOverlaid ? ACTIONS_CLAIM_CELL : undefined} gap={0.5} vAlign="center" hAlign="end">
        {actionsFor(item).map((action) => (
          <IconButton key={action.id} variant="ghost" size="sm" label={`${action.label}: ${item.subject}`} tooltip={action.label}
            icon={<Icon icon={action.icon} size="sm" />} onClick={() => onAct(action.id, item.id)} />
        ))}
      </HStack>
      <StackItem size="fill">
        <HStack {...(isOverlaid ? {} : reveal.getContentRevealProps({ isRevealInverted: true }))} style={HIDE_SQUEEZED_CONTENT} gap={1} vAlign="center" hAlign="end">
          {item.attachments.length === 0 ? null : <Icon icon={AttachIcon} size="sm" color="gray" label="Has an attachment" />}
          <Text color="secondary" hasTabularNumbers justify="end" maxLines={1} hasTruncateTooltip={false} weight={item.isUnread ? "semibold" : "normal"}>
            {item.receivedAt}
          </Text>
        </HStack>
      </StackItem>
    </HStack>
  );
}

/** Row behaviour: the row is the control surface. Click, Enter and Space open it; the checkbox and the actions do not. */
export function useInboxRows({ openId, onOpen, getContainerProps }: { openId: string | null; onOpen: (item: Conversation) => void; getContainerProps: UseContainerRevealReturn["getContainerProps"] }): TablePlugin<Conversation> {
  return useMemo(() => ({
    transformBodyRow: (props, item) => {
      const container = getContainerProps({ hoverDelay: HOVER_INTENT_MS });
      return {
        ...props,
        htmlProps: {
          ...props.htmlProps,
          className: [props.htmlProps.className, container.className].filter(Boolean).join(" "),
          style: { ...props.htmlProps.style, ...container.style },
          tabIndex: 0,
          "aria-current": item.id === openId ? true : undefined,
          onClick: (event) => { if (isRowItself(event)) onOpen(item); },
          onKeyDown: (event) => {
            // Space on a focused checkbox must toggle it and nothing else, and the keystroke bubbles to the row too.
            if ((event.key !== "Enter" && event.key !== " ") || !isRowItself(event)) return;
            event.preventDefault();
            onOpen(item);
          },
        },
      };
    },
    transformBodyCell: (props, _column, item) => (item.id === openId ? { ...props, htmlProps: { ...props.htmlProps, style: { ...props.htmlProps.style, ...OPEN_CELL_STYLE } } } : props),
  }), [getContainerProps, onOpen, openId]);
}

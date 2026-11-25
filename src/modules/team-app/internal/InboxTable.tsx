import { useMemo } from "react";
import { BellIcon, QuestionMarkCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { pixel, proportional, Table, type TableColumn, type TablePlugin } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { ItemData } from "../types.ts";

export const KINDS = {
  question: { icon: QuestionMarkCircleIcon, label: "Question" },
  approval: { icon: ShieldCheckIcon, label: "Ask" },
  notice: { icon: BellIcon, label: "Notice" },
} as const;

/** A control inside the row is its own: only a click on the row itself opens it. */
const OWN_CONTROL = 'button, input, a, label, [role="button"]';
const isRowItself = (event: { readonly target: EventTarget | null; readonly currentTarget: EventTarget | null }): boolean => {
  const control = (event.target as HTMLElement | null)?.closest(OWN_CONTROL);
  return !control || control === event.currentTarget || !(event.currentTarget as HTMLElement).contains(control);
};

/** The item as a table row: Astryx rows are plain records. */
type Row = { [Key in keyof ItemData]: ItemData[Key] };

const said = ({ answer }: Row): string => (answer === undefined ? "" : `${answer.byName || "Someone"} said: ${answer.text}`);

/** The row opens the reading pane, from the pointer or the keyboard. */
function useOpensPane(openId: string | undefined, onOpen: (id: string) => void): TablePlugin<Row> {
  return useMemo(
    () => ({
      transformBodyRow: (props, item) => ({
        ...props,
        htmlProps: {
          ...props.htmlProps,
          tabIndex: 0,
          "aria-current": item.id === openId ? true : undefined,
          onClick: (event) => {
            if (isRowItself(event)) onOpen(item.id);
          },
          onKeyDown: (event) => {
            if ((event.key !== "Enter" && event.key !== " ") || !isRowItself(event)) return;
            event.preventDefault();
            onOpen(item.id);
          },
        },
      }),
    }),
    [openId, onOpen],
  );
}

export interface InboxTableProps {
  readonly workspaceId: string;
  readonly items: readonly ItemData[];
  /** The row whose reading pane is open. */
  readonly openId?: string;
  readonly onOpen: (id: string) => void;
  /** A phone: no pane, so a row's question is a link to its own page. */
  readonly isNarrow: boolean;
  /** Little room beside the pane: the manager and what it blocks go under the question. */
  readonly isCompact: boolean;
}

const WHEN: TableColumn<Row> = {
  key: "createdAt",
  header: "Asked",
  width: pixel(100),
  align: "end",
  renderCell: ({ createdAt }) => <Timestamp value={Math.floor(createdAt / 1000)} format="relative" color="secondary" />,
};

const kindCell = (item: Row) => (
  <HStack gap={2} vAlign="center">
    <Icon icon={KINDS[item.kind].icon} size="sm" color={item.answer === undefined ? "warning" : "secondary"} />
    <Text>{KINDS[item.kind].label}</Text>
  </HStack>
);

function columns({ workspaceId, openId, isNarrow, isCompact }: InboxTableProps): TableColumn<Row>[] {
  const question: TableColumn<Row> = {
    key: "title",
    header: "Question",
    width: proportional(3, { minWidth: 180 }),
    renderCell: (item) => (
      <VStack>
        {isNarrow ? (
          <Link href={teamLinks.item(workspaceId, item.id)}>{item.title}</Link>
        ) : (
          <Text maxLines={2} weight={item.id === openId ? "semibold" : "normal"}>
            {item.title}
          </Text>
        )}
        {(isNarrow || isCompact) && (
          <Text type="supporting" maxLines={1}>
            {[KINDS[item.kind].label, item.managerName, item.task === undefined ? "" : `Blocks ${item.task}`, said(item)]
              .filter((part) => part !== "")
              .join(" · ")}
          </Text>
        )}
        {!isNarrow && !isCompact && item.answer !== undefined && (
          <Text type="supporting" maxLines={1}>
            {said(item)}
          </Text>
        )}
      </VStack>
    ),
  };
  if (isNarrow || isCompact) return [question, WHEN];
  return [
    { key: "kind", header: "Kind", width: pixel(110), renderCell: kindCell },
    question,
    { key: "manager", header: "Manager", width: pixel(120), renderCell: ({ managerName }) => <Text maxLines={1}>{managerName}</Text> },
    {
      key: "task",
      header: "Blocks",
      width: pixel(80),
      renderCell: ({ task }) => <Text color="secondary">{task ?? "Nothing"}</Text>,
    },
    WHEN,
  ];
}

/** Astryx's `table-inbox`: a row per item, and the one clicked opens in the reading pane beside it. */
export function InboxTable(props: InboxTableProps) {
  const rows = useOpensPane(props.isNarrow ? undefined : props.openId, props.onOpen);
  return (
    <Table
      data={[...props.items]}
      columns={columns(props)}
      idKey="id"
      plugins={props.isNarrow ? {} : { rows }}
      density="balanced"
      dividers="rows"
      hasHover
      aria-label="Inbox"
    />
  );
}

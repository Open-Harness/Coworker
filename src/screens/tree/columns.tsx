// astryx-template: table-tree
import type { ComponentType, SVGProps } from "react";
import { HStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { pixel, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { ArrowPathIcon, ExclamationTriangleIcon, HandRaisedIcon, MoonIcon, PauseCircleIcon } from "@heroicons/react/24/outline";
import type { Row, State } from "./rows.ts";

/** One glyph for each state, because the state is what a person scanning the tree looks for first. */
const STATE_ICON: Record<State, ComponentType<SVGProps<SVGSVGElement>>> = {
  working: ArrowPathIcon,
  "needs you": HandRaisedIcon,
  stuck: ExclamationTriangleIcon,
  idle: MoonIcon,
  paused: PauseCircleIcon,
};
const STATE_COLOR = { working: "success", "needs you": "warning", stuck: "error", idle: "secondary", paused: "secondary" } as const;
export const STATE_WORD: Record<State, string> = {
  working: "Working",
  "needs you": "Waits for you",
  stuck: "Stuck",
  idle: "Idle",
  paused: "Paused",
};

/** A header that says, on hover, that parents add up what is beneath them. */
const sumHeader = (label: string) => (
  <Tooltip content="Its own, plus what the managers below it have">
    <Text>{label}</Text>
  </Tooltip>
);

/** A number in a parent row says where it comes from. */
function Sum({ row, children }: { row: Row; children: string }) {
  const text = <Text color="secondary">{children}</Text>;
  return row.children?.length ? <Tooltip content={`${row.name} and the ${row.count - 1} beneath it`}>{text}</Tooltip> : text;
}

/** Its own number, then what the managers below it add: "8 + 2". */
const plusBelow = (own: number, all: number): string => (all > own ? `${own} + ${all - own}` : String(own));

/** On a phone: who, and what waits. The rest is on the manager's own page. */
export function buildColumns(isNarrow: boolean, href: (id: string) => string, day: (at: number) => string): TableColumn<Row>[] {
  const all: TableColumn<Row>[] = [
    {
      key: "name",
      header: "Manager",
      // Deep rows spend their width on indentation before the name even starts.
      width: proportional(1.3, { minWidth: isNarrow ? 150 : 190 }),
      sortable: true,
      renderCell: (row) => (
        <HStack gap={2} vAlign="center">
          <Icon icon={STATE_ICON[row.state]} size="sm" color={STATE_COLOR[row.state]} label={STATE_WORD[row.state]} />
          <Link href={href(row.id)}>{row.name}</Link>
        </HStack>
      ),
    },
    {
      // What a manager is doing varies a lot in length, so this column takes the slack.
      key: "now",
      header: "Doing now",
      width: proportional(1, { minWidth: 120 }),
      sortable: true,
      renderCell: (row) => <Text color="secondary">{row.now}</Text>,
    },
    {
      key: "open",
      header: sumHeader("Open"),
      width: pixel(isNarrow ? 68 : 76),
      align: "end",
      sortable: true,
      renderCell: (row) => <Sum row={row}>{plusBelow(row.own.open, row.open)}</Sum>,
    },
    {
      key: "waiting",
      header: sumHeader("Waiting"),
      width: pixel(isNarrow ? 92 : 104),
      align: "end",
      sortable: true,
      renderCell: (row) => <Sum row={row}>{plusBelow(row.own.waiting, row.waiting)}</Sum>,
    },
    {
      key: "sentBack",
      header: "Sent back",
      width: pixel(100),
      align: "end",
      sortable: true,
      renderCell: (row) => <Text color="secondary">{`${Math.round(row.sentBack * 100)}%`}</Text>,
    },
    {
      key: "changed",
      header: "Changed",
      width: pixel(100),
      align: "end",
      sortable: true,
      renderCell: (row) => <Text color="secondary">{day(row.changedAt)}</Text>,
    },
  ];
  return isNarrow ? all.filter((column) => ["name", "open", "waiting"].includes(String(column.key))) : all;
}

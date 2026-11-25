import type { ReactNode } from "react";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { useNarrow } from "~/modules/team-core/service.ts";

export interface DataColumn<T> {
  /** Empty for the column of buttons. */
  readonly header: string;
  readonly width?: number;
  readonly align?: "start" | "center" | "end";
  readonly cell: (item: T) => ReactNode;
}

/** Columns of words never get narrower than this. */
const MIN_WORDS = 160;

type Row<T> = { readonly [key: string]: unknown; readonly id: string; readonly item: T };

/** On a phone a row is one list item: its first cell, the others under it with their headers, and its buttons beside it. */
function Stacked<T>({
  items,
  idOf,
  columns,
}: {
  readonly items: readonly T[];
  readonly idOf: (item: T) => string;
  readonly columns: readonly DataColumn<T>[];
}) {
  const [first, ...rest] = columns;
  if (first === undefined) return null;
  const buttons = rest.filter(({ header }) => header === "");
  const words = rest.filter(({ header }) => header !== "");
  return (
    <List hasDividers>
      {items.map((item) => (
        <ListItem
          key={idOf(item)}
          align="first-line"
          label={first.cell(item)}
          description={
            <VStack gap={1}>
              {words.map(({ header, cell }) => (
                <VStack key={header} gap={0}>
                  <Text type="supporting">{header}</Text>
                  {cell(item)}
                </VStack>
              ))}
            </VStack>
          }
          endContent={buttons.map(({ cell }, index) => (
            <VStack key={index}>{cell(item)}</VStack>
          ))}
        />
      ))}
    </List>
  );
}

/** A card that is all table: rows of one kind of thing, and what to say when there are none. */
export function DataTable<T>({
  items,
  idOf,
  columns,
  empty,
}: {
  readonly items: readonly T[];
  readonly idOf: (item: T) => string;
  readonly columns: readonly DataColumn<T>[];
  readonly empty: string;
}) {
  const isNarrow = useNarrow();
  if (items.length === 0) return <EmptyState title={empty} isCompact />;
  return (
    <Card padding={0}>
      {isNarrow ? (
        <Stacked items={items} idOf={idOf} columns={columns} />
      ) : (
        <Table
          data={items.map((item): Row<T> => ({ id: idOf(item), item }))}
          idKey="id"
          columns={columns.map(({ header, width, align, cell }, index) => ({
            key: `column-${index}`,
            header,
            width: width === undefined ? proportional(1, { minWidth: MIN_WORDS }) : pixel(width),
            ...(align === undefined ? {} : { align }),
            renderCell: ({ item }: Row<T>) => cell(item),
          }))}
        />
      )}
    </Card>
  );
}

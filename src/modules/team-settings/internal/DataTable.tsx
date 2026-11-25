import type { ReactNode } from "react";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { useNarrow } from "~/modules/team-core/service.ts";

export interface DataColumn<T> {
  readonly header: string;
  readonly width?: number;
  readonly align?: "start" | "center" | "end";
  readonly cell: (item: T) => ReactNode;
}

/** Columns of words never get narrower than this: on a phone the table scrolls sideways instead. */
const MIN_WORDS = 200;

type Row<T> = { readonly [key: string]: unknown; readonly id: string; readonly item: T };

/**
 * A card that is all table: rows of one kind of thing, and what to say when there are none. With `stacked`, a phone gets
 * one card for each row instead, so that nothing, such as a button in the last column, is out of reach.
 */
export function DataTable<T>({
  items,
  idOf,
  columns,
  empty,
  stacked = false,
}: {
  readonly items: readonly T[];
  readonly idOf: (item: T) => string;
  readonly columns: readonly DataColumn<T>[];
  readonly empty: string;
  readonly stacked?: boolean;
}) {
  const isNarrow = useNarrow();
  if (stacked && isNarrow)
    return (
      <VStack gap={3}>
        {items.length === 0 && <EmptyState title={empty} isCompact />}
        {items.map((item) => (
          <Card key={idOf(item)} padding={4}>
            <VStack gap={2}>
              {columns.map(({ header, cell }, index) =>
                header === "" ? (
                  <HStack key={index} gap={1} wrap="wrap">
                    {cell(item)}
                  </HStack>
                ) : (
                  <VStack key={index} gap={0}>
                    <Text type="supporting">{header}</Text>
                    {cell(item)}
                  </VStack>
                ),
              )}
            </VStack>
          </Card>
        ))}
      </VStack>
    );
  return (
    <Card padding={0}>
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
        emptyState={<EmptyState title={empty} isCompact />}
      />
    </Card>
  );
}

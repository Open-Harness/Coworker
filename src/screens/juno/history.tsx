// astryx-template: table
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import type { CoworkerView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "./act.ts";
import { useWords } from "./words.ts";

type Done = CoworkerView["history"][number];
interface Row extends Record<string, unknown> {
  id: string;
  when: string;
  did: string;
  with: string;
  undo: Done["undo"];
  label: string;
}

/** Everything Juno did, by itself or with someone, newest first. Where there is a way back, there is Undo. */
export function History({ view }: { readonly view: CoworkerView }) {
  const [act, words] = [useDoing(), useWords()];
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const rows: Row[] = [...view.history]
    .sort((a, b) => b.at - a.at)
    .map((one) => ({
      id: one.id,
      when: words.when(one.at),
      did: one.says,
      with: one.with ?? "Itself",
      undo: one.undo,
      label: one.undoLabel ?? "Undo",
    }));
  const cols: TableColumn<Row>[] = [
    {
      key: "when",
      header: "When",
      width: pixel(130),
      renderCell: (r) => (
        <Text type="supporting" color="secondary" maxLines={1}>
          {r.when}
        </Text>
      ),
    },
    {
      key: "did",
      header: "What",
      width: proportional(2, { minWidth: 220 }),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text type="body" maxLines={2}>
            {r.did}
          </Text>
          {isNarrow && <Text type="supporting" color="secondary" maxLines={1}>{`${r.when}, ${r.with}`}</Text>}
        </VStack>
      ),
    },
    {
      key: "with",
      header: "With",
      width: pixel(130),
      renderCell: (r) => (
        <Text type="body" color="secondary" maxLines={1}>
          {r.with}
        </Text>
      ),
    },
    {
      key: "undo",
      header: "",
      width: pixel(isNarrow ? 96 : 220),
      renderCell: (r) =>
        r.undo === "cannot" ? null : r.undo === "too late" ? (
          <Text type="supporting" color="secondary">
            Too late
          </Text>
        ) : (
          <Button
            label={isNarrow ? "Undo" : r.label}
            size="sm"
            variant="secondary"
            onClick={() => void act("history.undo", { entry: r.id })}
          />
        ),
    },
  ];
  const columns = isNarrow ? cols.filter((c) => ["did", "undo"].includes(c.key as string)) : cols;
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider={false} padding={4}>
          <HStack>
            <StackItem size="fill">
              <Text type="supporting" color="secondary">
                Everything Juno did, by itself or with someone. Going back is a new version, never an erasure.
              </Text>
            </StackItem>
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={0}>
          <Table<Row> data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" hasHover />
        </LayoutContent>
      }
    />
  );
}

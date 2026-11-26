// astryx-template: table
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { DID, type Did } from "../facts";

export const meta = { fills: true };
type Row = Did & Record<string, unknown>;

/** Everything Juno did, by itself or with someone, newest first. Where there is a way back, there is Undo. */
export default function History({ onDirty }: { onDirty: () => void }) {
  void onDirty;
  const showToast = useToast();
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [undone, setUndone] = useState<ReadonlySet<string>>(new Set());
  const cols: TableColumn<Row>[] = [
    { key: "when", header: "When", width: pixel(130), renderCell: (r) => <Text type="supporting" color="secondary" maxLines={1}>{r.when}</Text> },
    { key: "did", header: "What", width: proportional(2, { minWidth: 220 }), renderCell: (r) => <VStack gap={0}><Text type="body" maxLines={2}>{r.did}</Text>{isNarrow && <Text type="supporting" color="secondary" maxLines={1}>{`${r.when}, ${r.with}`}</Text>}</VStack> },
    { key: "with", header: "With", width: pixel(130), renderCell: (r) => <Text type="body" color="secondary" maxLines={1}>{r.with}</Text> },
    { key: "undo", header: "", width: pixel(isNarrow ? 96 : 220), renderCell: (r) => !r.undo ? null : undone.has(r.id) ? <Text type="supporting" color="secondary">Undone</Text>
      : <Button label={isNarrow ? "Undo" : r.undo} size="sm" variant="secondary" onClick={() => { setUndone((x) => new Set(x).add(r.id)); showToast({ body: `${r.undo}. Juno says so in your chat.`, uniqueID: r.id }); }} /> },
  ];
  const columns = isNarrow ? cols.filter((c) => ["did", "undo"].includes(c.key as string)) : cols;
  return (
    <Layout height="fill"
      header={<LayoutHeader hasDivider={false} padding={4}><HStack><StackItem size="fill"><Text type="supporting" color="secondary">Everything Juno did, by itself or with someone. Going back is a new version, never an erasure.</Text></StackItem></HStack></LayoutHeader>}
      content={<LayoutContent role="main" padding={0}><Table<Row> data={DID.map((d) => ({ ...d }))} columns={columns} idKey="id" density="balanced" dividers="rows" hasHover /></LayoutContent>} />
  );
}

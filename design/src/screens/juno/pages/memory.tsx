// astryx-template: table
import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, StackItem, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { CORRECTIONS, NOTES, type Note } from "../facts";

export const meta = { fills: true };
type Row = Note & Record<string, unknown>;

/** What Juno was told and keeps, and corrections that wait for a person. It forgets one when you say so. */
export default function Memory({ onDirty }: { onDirty: () => void }) {
  void onDirty;
  const showToast = useToast();
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [notes, setNotes] = useState<Note[]>(() => NOTES.map((n) => ({ ...n })));
  const [waiting, setWaiting] = useState(CORRECTIONS);
  const say = (body: string) => showToast({ body, uniqueID: body });
  const cols: TableColumn<Row>[] = [
    { key: "text", header: "Note", width: proportional(2, { minWidth: 220 }), renderCell: (r) => <VStack gap={0}><Text type="body" maxLines={2}>{r.text}</Text>{isNarrow && <Text type="supporting" color="secondary" maxLines={1}>{`${r.by}, ${r.where}, for ${r.for}`}</Text>}</VStack> },
    { key: "by", header: "Said by", width: proportional(1, { minWidth: 150 }), renderCell: (r) => <VStack gap={0}><Text type="body" maxLines={1}>{r.by}</Text><Text type="supporting" color="secondary" maxLines={1}>{`${r.where}, ${r.told}`}</Text></VStack> },
    { key: "for", header: "For", width: pixel(130), renderCell: (r) => <Text type="body" color="secondary" maxLines={1}>{r.for}</Text> },
    { key: "used", header: "Last used", width: pixel(130), renderCell: (r) => <Text type="supporting" color="secondary" maxLines={1}>{r.used}</Text> },
    { key: "forget", header: "", width: pixel(96), renderCell: (r) => <Button label="Forget" size="sm" variant="ghost" onClick={() => { setNotes((x) => x.filter((n) => n.id !== r.id)); say("Forgotten. It is in History, and not used again."); }} /> },
  ];
  const columns = isNarrow ? cols.filter((c) => ["text", "forget"].includes(c.key as string)) : cols;
  return (
    <Layout height="fill" content={
      <LayoutContent role="main" padding={0}>
        <VStack gap={4}>
          <VStack gap={4} paddingInline={4} paddingBlockStart={isNarrow ? 0 : 4}>
            <Text type="supporting" color="secondary">What people told Juno, and where. It uses a note only for the manager named, and for you when it helps. A note from a customer stays with the manager it was told to.</Text>
            {waiting.length > 0 && (
              <VStack gap={3}>
                <HStack gap={2} vAlign="center"><Heading level={3}>Corrections</Heading><Badge label={`${waiting.length} wait for you`} variant="warning" /></HStack>
                {waiting.map((c) => (
                  <Card key={c.id} padding={4}>
                    <VStack gap={3}>
                      <VStack gap={1}>
                        <Text type="supporting" color="secondary">Was</Text><Text type="body" decoration="line-through">{c.was}</Text>
                        <Text type="supporting" color="secondary">Becomes</Text><Text type="body">{c.now}</Text>
                      </VStack>
                      <HStack gap={3} vAlign="center" wrap="wrap">
                        <StackItem size="fill"><Text type="supporting" color="secondary">{`${c.by}, ${c.where}, ${c.when}`}</Text></StackItem>
                        <HStack gap={2}>
                          <Button label="Accept" size="sm" variant="primary" onClick={() => { setNotes((x) => x.map((n) => (n.id === c.noteId ? { ...n, text: c.now } : n))); setWaiting((x) => x.filter((y) => y.id !== c.id)); say("Changed"); }} />
                          <Button label="Leave it" size="sm" variant="secondary" onClick={() => { setWaiting((x) => x.filter((y) => y.id !== c.id)); say("Left as it was"); }} />
                        </HStack>
                      </HStack>
                    </VStack>
                  </Card>
                ))}
              </VStack>
            )}
            <Heading level={3}>{`Notes, ${notes.length}`}</Heading>
          </VStack>
          <Table<Row> data={notes.map((n) => ({ ...n }))} columns={columns} idKey="id" density="balanced" dividers="rows" hasHover />
        </VStack>
      </LayoutContent>} />
  );
}

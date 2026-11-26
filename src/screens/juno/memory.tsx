// astryx-template: table
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, StackItem, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { CoworkerView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "./act.ts";
import { useWords } from "./words.ts";

interface Row extends Record<string, unknown> {
  id: string;
  says: string;
  by: string;
  where: string;
  told: string;
  for: string;
  used: string;
}

/** What people told Juno, and corrections that wait for a person. It forgets one when you say so. */
export function Memory({ view }: { readonly view: CoworkerView }) {
  const [act, words] = [useDoing(), useWords()];
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const named = (note: CoworkerView["memory"][number]): string => {
    if (note.for === undefined) return view.identity.name;
    return note.for.tree && note.for.manager === "root" ? "Everyone" : words.manager(note.for.manager);
  };
  const notes: Row[] = view.memory
    .filter((note) => note.state === "kept")
    .map((note) => ({
      id: note.id,
      says: note.says,
      by: note.by,
      where: note.where,
      told: words.date(note.at),
      for: named(note),
      used: note.used === null ? "" : words.when(note.used),
    }));
  const columns: TableColumn<Row>[] = [
    {
      key: "text",
      header: "Note",
      width: proportional(2, { minWidth: 220 }),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text type="body" maxLines={2}>
            {r.says}
          </Text>
          {isNarrow && <Text type="supporting" color="secondary" maxLines={1}>{`${r.by}, ${r.where}, for ${r.for}`}</Text>}
        </VStack>
      ),
    },
    {
      key: "by",
      header: "Said by",
      width: proportional(1, { minWidth: 150 }),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text type="body" maxLines={1}>
            {r.by}
          </Text>
          <Text type="supporting" color="secondary" maxLines={1}>{`${r.where}, ${r.told}`}</Text>
        </VStack>
      ),
    },
    {
      key: "for",
      header: "For",
      width: pixel(130),
      renderCell: (r) => (
        <Text type="body" color="secondary" maxLines={1}>
          {r.for}
        </Text>
      ),
    },
    {
      key: "used",
      header: "Last used",
      width: pixel(130),
      renderCell: (r) => (
        <Text type="supporting" color="secondary" maxLines={1}>
          {r.used}
        </Text>
      ),
    },
    {
      key: "forget",
      header: "",
      width: pixel(96),
      renderCell: (r) => <Button label="Forget" size="sm" variant="ghost" onClick={() => void act("note.forget", { note: r.id })} />,
    },
  ];
  const shown = isNarrow ? columns.filter((c) => ["text", "forget"].includes(c.key as string)) : columns;
  const waiting = view.corrections;
  return (
    <Layout
      height="fill"
      content={
        <LayoutContent role="main" padding={0}>
          <VStack gap={4}>
            <VStack gap={4} paddingInline={4} paddingBlockStart={isNarrow ? 0 : 4}>
              <Text type="supporting" color="secondary">
                What people told Juno, and where. It uses a note only for the manager named, and for you when it helps. A note from a
                customer stays with the manager it was told to.
              </Text>
              {waiting.length > 0 && (
                <VStack gap={3}>
                  <HStack gap={2} vAlign="center">
                    <Heading level={3}>Corrections</Heading>
                    <Badge label={`${waiting.length} wait for you`} variant="warning" />
                  </HStack>
                  {waiting.map((c) => (
                    <Card key={c.id} padding={4}>
                      <VStack gap={3}>
                        <VStack gap={1}>
                          <Text type="supporting" color="secondary">
                            Was
                          </Text>
                          <Text type="body" hasStrikethrough>
                            {c.was}
                          </Text>
                          <Text type="supporting" color="secondary">
                            Becomes
                          </Text>
                          <Text type="body">{c.now}</Text>
                        </VStack>
                        <HStack gap={3} vAlign="center" wrap="wrap">
                          <StackItem size="fill">
                            <Text type="supporting" color="secondary">{`${c.by}, ${c.where}, ${words.when(c.at)}`}</Text>
                          </StackItem>
                          <HStack gap={2}>
                            <Button
                              label="Accept"
                              size="sm"
                              variant="primary"
                              onClick={() => void act("note.accept", { note: c.note, correction: c.id })}
                            />
                            <Button
                              label="Leave it"
                              size="sm"
                              variant="secondary"
                              onClick={() => void act("note.leave", { note: c.note, correction: c.id })}
                            />
                          </HStack>
                        </HStack>
                      </VStack>
                    </Card>
                  ))}
                </VStack>
              )}
              <Heading level={3}>{`Notes, ${notes.length}`}</Heading>
            </VStack>
            <Table<Row> data={notes} columns={shown} idKey="id" density="balanced" dividers="rows" hasHover />
          </VStack>
        </LayoutContent>
      }
    />
  );
}

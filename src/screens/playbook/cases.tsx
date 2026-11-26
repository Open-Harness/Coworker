import { useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import type { JudgedCase } from "~/modules/views-manager/types.ts";
import { useDay } from "./day.ts";
import { Head } from "./head.tsx";
import { useNotes } from "./notes.tsx";
import { nameOfLine } from "./words.ts";

interface CaseRow extends Record<string, unknown> {
  id: string;
  c: JudgedCase;
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The past work a person judges: right or wrong, and one line on what was wrong. */
export function Cases({ judge }: { judge: string }) {
  const { isDraft, change, view } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const date = useDay();
  const { shown, total } = view.cases;
  const [said, setSaid] = useState<Readonly<Record<string, string>>>(
    Object.fromEntries(shown.flatMap((c) => (c.said === null ? [] : [[c.id, c.said]]))),
  );
  const [why, setWhy] = useState<Readonly<Record<string, string>>>(
    Object.fromEntries(shown.flatMap((c) => (c.why === null ? [] : [[c.id, c.why]]))),
  );
  const caseCols: TableColumn<CaseRow>[] = [
    {
      key: "what",
      header: "What came",
      width: proportional(3, { minWidth: 130 }),
      renderCell: ({ c }) => (
        <VStack gap={0}>
          <Text>{c.what}</Text>
          <Text type="supporting" color="secondary">
            Then: {c.happened}
          </Text>
        </VStack>
      ),
    },
    {
      key: "did",
      header: "It would",
      width: proportional(2, { minWidth: 92 }),
      renderCell: ({ c }) => (
        <VStack gap={0}>
          <Text color="secondary">{c.would}</Text>
          {!isNarrow && (
            <Text type="supporting" color="secondary">
              Judges: {nameOfLine(view, c.of)}
            </Text>
          )}
        </VStack>
      ),
    },
    {
      key: "say",
      header: "Was it right?",
      width: pixel(isNarrow ? 150 : 176),
      renderCell: ({ c }) => (
        <ToggleButtonGroup
          label={`Was it right: ${c.what}`}
          value={said[c.id] ?? null}
          size="sm"
          onChange={(v) => {
            setSaid((x) => ({ ...x, [c.id]: typeof v === "string" ? v : "" }));
            change();
          }}
        >
          <ToggleButton value="right" label="Right" />
          <ToggleButton value="wrong" label="Wrong" />
        </ToggleButtonGroup>
      ),
    },
  ];
  const left = shown.filter((c) => !said[c.id]).length;
  const wrong = shown.filter((c) => said[c.id] === "wrong");
  const judged = shown.filter((c) => c.said !== null).length;
  const when = new Date(view.saidBy.at);
  const about = isDraft
    ? `${view.past === null ? "Past work" : `${date.day(view.past.from)} to ${date.day(view.past.to)}`}, nothing sent. ${judge} judged ${judged} of them. The other ${total - shown.length} are like these, or plain.`
    : `The first ten, as judged on ${when.getUTCDate()} ${MONTHS[when.getUTCMonth()] ?? ""}. There are ${total} now.`;
  return (
    <VStack gap={3}>
      <HStack gap={2} vAlign="end">
        <StackItem size="fill">
          <Head title="Ten cases that teach it most" about={about} />
        </StackItem>
        {left > 0 && (
          <Text type="supporting" color="secondary">
            {left} to judge
          </Text>
        )}
      </HStack>
      <Table<CaseRow>
        data={shown.map((c) => ({ id: c.id, c }))}
        columns={caseCols}
        idKey="id"
        dividers="rows"
        density="compact"
        verticalAlign="top"
      />
      {wrong.map((c) => (
        <TextArea
          key={c.id}
          label={`What was wrong: ${c.what}`}
          rows={2}
          value={why[c.id] ?? ""}
          onChange={(v: string) => {
            setWhy((x) => ({ ...x, [c.id]: v }));
            change();
          }}
          placeholder="One line is enough"
        />
      ))}
    </VStack>
  );
}

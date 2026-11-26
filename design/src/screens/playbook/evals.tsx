import { useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { ToggleButton, ToggleButtonGroup } from "@astryxdesign/core/ToggleButton";
import { Token } from "@astryxdesign/core/Token";
import { CASES, EVALS, type Case, type Eval } from "./data";
import { Note, useNotes } from "./notes";

interface Row extends Record<string, unknown> { id: string; e: Eval }
interface CaseRow extends Record<string, unknown> { id: string; c: Case }
const Head = ({ title, about }: { title: string; about: string }) => <VStack gap={0}><Heading level={4} accessibilityLevel={2}>{title}</Heading><Text type="supporting" color="secondary">{about}</Text></VStack>;

/** How we know each part is any good, the past work a person judged, and what may be tried to make it better. */
export function Evals() {
  const { isDraft, change } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const [said, setSaid] = useState<Readonly<Record<string, string>>>(isDraft ? { w3: "wrong", w1: "right", w4: "right" } : Object.fromEntries(CASES.map((c) => [c.id, c.id === "w3" ? "wrong" : "right"])));
  const [why, setWhy] = useState<Readonly<Record<string, string>>>({ w3: "Raising money is not a sign." });
  const cols: TableColumn<Row>[] = [
    { key: "of", header: "Part", width: proportional(2, { minWidth: 130 }), renderCell: ({ e }) => <VStack gap={0}><Text type="label">{e.of}</Text><Text type="supporting" color="secondary">{e.kind}{isNarrow ? `. ${e.good}. Aim: ${e.line}` : ""}</Text></VStack> },
    ...(isNarrow ? [] : [
      { key: "good", header: "Good means", width: proportional(3), renderCell: ({ e }: Row) => <VStack gap={0}><Text>{e.good}</Text><Text type="supporting" color="secondary">{e.judge}</Text></VStack> },
      { key: "cases", header: "Cases", width: pixel(84), align: "end" as const, renderCell: ({ e }: Row) => <Text color="secondary">{e.cases}</Text> },
      { key: "line", header: "Aim", width: pixel(108), align: "end" as const, renderCell: ({ e }: Row) => <Text color="secondary">{e.line}</Text> },
    ]),
    { key: "now", header: isDraft ? "On past work" : "Now", width: pixel(112), align: "end", renderCell: ({ e }) => <VStack gap={0.5} hAlign="end"><Text hasTabularNumbers weight="semibold">{isDraft ? e.first : e.now}</Text>{isDraft && e.poor && <Token size="sm" color="red" label="Below its aim" />}{!isDraft && <Text type="supporting" color="secondary">Was {e.first}</Text>}</VStack> },
    { key: "do", header: "", width: pixel(60), renderCell: ({ e }) => <Note at={e.of} /> },
  ];
  const caseCols: TableColumn<CaseRow>[] = [
    { key: "what", header: "What came", width: proportional(3, { minWidth: 130 }), renderCell: ({ c }) => <VStack gap={0}><Text>{c.what}</Text><Text type="supporting" color="secondary">Then: {c.real}</Text></VStack> },
    { key: "did", header: "It would", width: proportional(2, { minWidth: 92 }), renderCell: ({ c }) => <VStack gap={0}><Text color="secondary">{c.did}</Text>{!isNarrow && <Text type="supporting" color="secondary">Judges: {c.part}</Text>}</VStack> },
    { key: "say", header: "Was it right?", width: pixel(isNarrow ? 150 : 176), renderCell: ({ c }) => (
      <ToggleButtonGroup label={`Was it right: ${c.what}`} value={said[c.id] ?? null} size="sm" onChange={(v) => { setSaid((x) => ({ ...x, [c.id]: typeof v === "string" ? v : "" })); change(); }}>
        <ToggleButton value="right" label="Right" /><ToggleButton value="wrong" label="Wrong" />
      </ToggleButtonGroup>
    ) },
  ];
  const left = CASES.filter((c) => !said[c.id]).length; const wrong = CASES.filter((c) => said[c.id] === "wrong");
  return (
    <VStack gap={8}>
      <VStack gap={3}><Head title="Each part, and how we know" about="Read where the manager cannot write, or said by a person. Nothing is in here without one." /><Table<Row> data={EVALS.map((e) => ({ id: e.id, e }))} columns={cols} idKey="id" dividers="rows" density="compact" verticalAlign="top" /></VStack>
      <VStack gap={3}>
        <HStack gap={2} vAlign="end"><StackItem size="fill"><Head title="Ten cases that teach it most" about={isDraft ? "5 Sep to 4 Oct, nothing sent. Bo judged 3 of them. The other 138 are like these, or plain." : "The first ten, as judged on 5 October. There are 412 now."} /></StackItem>{left > 0 && <Text type="supporting" color="secondary">{left} to judge</Text>}</HStack>
        <Table<CaseRow> data={CASES.map((c) => ({ id: c.id, c }))} columns={caseCols} idKey="id" dividers="rows" density="compact" verticalAlign="top" />
        {wrong.map((c) => <TextArea key={c.id} label={`What was wrong: ${c.what}`} rows={2} value={why[c.id] ?? ""} onChange={(v: string) => { setWhy((x) => ({ ...x, [c.id]: v })); change(); }} placeholder="One line is enough" />)}
      </VStack>
      <VStack gap={3}>
        <Head title="How it gets better" about="Each week Juno takes the weakest part and tries one change: on the cases, then beside the old one." />
        <List density="balanced" hasDividers>
          <ListItem label="Juno may try and keep by itself" description="Wording, which skills, which model, how often it looks" endContent={<Text type="supporting" color="secondary">If better, and the objective not worse</Text>} />
          <ListItem label="Juno proposes, you say yes" description="Steps, who does them, reach, anything that writes to people" endContent={<Text type="supporting" color="secondary">As a comment with a change</Text>} />
          <ListItem label="Only a person" description="What good means, the aims, the cases" endContent={<Text type="supporting" color="secondary">Ama and Bo</Text>} />
        </List>
      </VStack>
    </VStack>
  );
}

import { useMediaQuery } from "@astryxdesign/core/hooks";
import { VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { useDay } from "./day.ts";
import type { PlaybookView } from "~/modules/views-manager/types.ts";
import { evalWords } from "./measure.ts";
import { Cases } from "./cases.tsx";
import { Head } from "./head.tsx";
import { Note, useNotes } from "./notes.tsx";
import { kindOfLine, nameOfLine } from "./words.ts";

type Stand = PlaybookView["evals"][number];
interface Row extends Record<string, unknown> {
  id: string;
  e: Stand;
}
/** How we know each part is any good, the past work a person judged, and what may be tried to make it better. */
export function Evals() {
  const { isDraft, view, person } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const date = useDay();
  const aim = view.playbook.objective.aim;
  const at = (e: Stand, n: number) => evalWords(n, e.eval.line.unit);
  const line = (e: Stand) =>
    e.eval.of === "playbook" ? `${e.eval.line.value} by ${date.day(Date.parse(aim.by))}` : at(e, e.eval.line.value);
  const poor = (e: Stand) => e.eval.of !== "playbook" && e.now !== null && e.now < e.eval.line.value;
  const cols: TableColumn<Row>[] = [
    {
      key: "of",
      header: "Part",
      width: proportional(2, { minWidth: 130 }),
      renderCell: ({ e }) => (
        <VStack gap={0}>
          <Text type="label">{nameOfLine(view, e.eval.of)}</Text>
          <Text type="supporting" color="secondary">
            {kindOfLine(view, e.eval.of)}
            {isNarrow ? `. ${e.eval.good}. Aim: ${line(e)}` : ""}
          </Text>
        </VStack>
      ),
    },
    ...(isNarrow
      ? []
      : [
          {
            key: "good",
            header: "Good means",
            width: proportional(3),
            renderCell: ({ e }: Row) => (
              <VStack gap={0}>
                <Text>{e.eval.good}</Text>
                <Text type="supporting" color="secondary">
                  {e.how}
                </Text>
              </VStack>
            ),
          },
          {
            key: "cases",
            header: "Cases",
            width: pixel(84),
            align: "end" as const,
            renderCell: ({ e }: Row) => <Text color="secondary">{e.eval.cases.length === 0 ? "Live" : String(e.eval.cases.length)}</Text>,
          },
          {
            key: "line",
            header: "Aim",
            width: pixel(108),
            align: "end" as const,
            renderCell: ({ e }: Row) => <Text color="secondary">{line(e)}</Text>,
          },
        ]),
    {
      key: "now",
      header: isDraft ? "On past work" : "Now",
      width: pixel(112),
      align: "end",
      renderCell: ({ e }) => (
        <VStack gap={0.5} hAlign="end">
          <Text hasTabularNumbers weight="semibold">
            {e.now === null ? "" : at(e, e.now)}
          </Text>
          {isDraft && poor(e) && <Token size="sm" color="red" label="Below its aim" />}
          {!isDraft && e.was !== null && (
            <Text type="supporting" color="secondary">
              Was {at(e, e.was)}
            </Text>
          )}
        </VStack>
      ),
    },
    { key: "do", header: "", width: pixel(60), renderCell: ({ e }) => <Note at={nameOfLine(view, e.eval.of)} /> },
  ];
  const judge =
    view.evals[0] === undefined
      ? ""
      : typeof view.evals[0].eval.judge === "object" && "person" in view.evals[0].eval.judge
        ? (person(view.evals[0].eval.judge.person).split(" ")[0] ?? "")
        : "";
  return (
    <VStack gap={8}>
      <VStack gap={3}>
        <Head
          title="Each part, and how we know"
          about="Read where the manager cannot write, or said by a person. Nothing is in here without one."
        />
        <Table<Row>
          data={view.evals.map((e) => ({ id: e.eval.id, e }))}
          columns={cols}
          idKey="id"
          dividers="rows"
          density="compact"
          verticalAlign="top"
        />
      </VStack>
      <Cases judge={judge} />
      <VStack gap={3}>
        <Head
          title="How it gets better"
          about="Each week Juno takes the weakest part and tries one change: on the cases, then beside the old one."
        />
        <List density="balanced" hasDividers>
          <ListItem
            label="Juno may try and keep by itself"
            description="Wording, which skills, which model, how often it looks"
            endContent={
              <Text type="supporting" color="secondary">
                If better, and the objective not worse
              </Text>
            }
          />
          <ListItem
            label="Juno proposes, you say yes"
            description="Steps, who does them, reach, anything that writes to people"
            endContent={
              <Text type="supporting" color="secondary">
                As a comment with a change
              </Text>
            }
          />
          <ListItem
            label="Only a person"
            description="What good means, the aims, the cases"
            endContent={
              <Text type="supporting" color="secondary">{`${person(view.playbook.objective.owner).split(" ")[0]} and ${judge}`}</Text>
            }
          />
        </List>
      </VStack>
    </VStack>
  );
}

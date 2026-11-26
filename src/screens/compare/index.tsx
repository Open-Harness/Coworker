// astryx-template: table-comparison
import { useMemo, useState, type ReactElement } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Table, pixel, proportional, useTableGroupedRows, useTableStickyColumns, type TableColumn } from "@astryxdesign/core/Table";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";
import { Reading } from "~/modules/page/service.ts";
import { ManagerFrame } from "~/screens/playbook/frame.tsx";
import type { PageProps } from "~/modules/page/types.ts";
import type { CompareView, PlaybookView } from "~/modules/views-manager/types.ts";
import { GROUPS, linesOf, type Line, type Side } from "./lines.ts";

interface Row extends Record<string, unknown> {
  id: string;
  line: Line;
}
interface DiffRow extends Record<string, unknown> {
  id: string;
  what: string;
  now: string;
  next: string;
}

/* The winner's wash fills the whole cell: it undoes the cell's padding, so it follows density="spacious" on the table. */
const BEST = {
  backgroundColor: "var(--color-background-blue)",
  boxSizing: "content-box",
  marginBlock: "calc(-1 * var(--spacing-3))",
  marginInline: "calc(-1 * var(--spacing-4))",
  paddingBlock: "var(--spacing-3)",
  paddingInline: "var(--spacing-4)",
} as const;
const FRAME = { width: "100%", maxWidth: "100%", minWidth: 0 } as const;
const GROUP = { position: "sticky", insetInlineStart: "var(--spacing-6)", width: "fit-content" } as const;

/** The better value of a row. A row with no direction, or the same on both sides, marks nothing: a tie is not a win. */
const bestOf = (l: Line): number | undefined => {
  if (l.better === undefined || l.now.n === undefined || l.next.n === undefined || l.now.n === l.next.n) return undefined;
  return l.better === "higher" ? Math.max(l.now.n, l.next.n) : Math.min(l.now.n, l.next.n);
};
const Cell = ({ side, isBest, isNumber }: { side: Side; isBest: boolean; isNumber: boolean }) => (
  <VStack gap={0.5} hAlign="end" {...(isBest ? { style: BEST } : {})}>
    <Text type="body" hasTabularNumbers={isNumber} weight={isBest ? "semibold" : "normal"}>
      {side.text}
    </Text>
    {side.note !== undefined && (
      <Text type="supporting" color="secondary">
        {side.note}
      </Text>
    )}
  </VStack>
);
const number = (name: string): string => name.replace(/^Version /u, "");

/** One version of the playbook beside the proposed next, on the same past cases. The manager's name and tabs are above. */
function Compare({ view, playbook }: { view: CompareView; playbook: PlaybookView["playbook"] }) {
  const isNarrow = useMediaQuery("(max-width: 700px)");
  const showToast = useToast();
  const [chosen, setChosen] = useState<"now" | "next" | null>(null);
  const [shut, setShut] = useState<Set<string>>(new Set());
  const lines = useMemo(() => linesOf(view, playbook), [view, playbook]);
  const { names, trial } = view;
  const columns = useMemo<TableColumn<Row>[]>(() => {
    const side = (key: "now" | "next", head: string, tag: ReactElement): TableColumn<Row> => ({
      key,
      width: proportional(1, { minWidth: isNarrow ? 112 : 200 }),
      align: "end",
      header: (
        <VStack gap={0.5} hAlign="end">
          <Text type="label">{head}</Text>
          {tag}
        </VStack>
      ),
      renderCell: ({ line }) => (
        <Cell side={line[key]} isNumber={line[key].n !== undefined} isBest={bestOf(line) !== undefined && line[key].n === bestOf(line)} />
      ),
    });
    return [
      {
        key: "spec",
        header: "",
        width: pixel(isNarrow ? 96 : 220),
        renderCell: ({ line }) => (
          <Text type="label" color="secondary">
            {line.label}
          </Text>
        ),
      },
      side("now", names.now, <Token size="sm" color="gray" label="Running" />),
      side("next", names.next, <Token size="sm" color="blue" label="Proposed" />),
    ];
  }, [isNarrow, names]);
  const grouped = useTableGroupedRows<Row>({
    data: lines.map((line) => ({ id: line.id, line })),
    groupBy: (r) => r.line.group,
    groupOrder: [...GROUPS],
    getRowKey: (r) => r.id,
    collapsedGroups: shut,
    onToggleGroup: (g: string) =>
      setShut((s) => {
        const n = new Set(s);
        if (n.has(g)) n.delete(g);
        else n.add(g);
        return n;
      }),
    renderGroupHeader: (g: string) => (
      <HStack gap={2} vAlign="center" style={GROUP}>
        <Heading level={3} accessibilityLevel={2}>
          {g}
        </Heading>
      </HStack>
    ),
  });
  const sticky = useTableStickyColumns<Row>({ startKeys: ["spec"] });
  const differ: DiffRow[] = view.cases.map((c) => ({
    id: c.id,
    what: c.what,
    now: trial.differ.find((d) => d.case === c.id)?.now.says ?? "",
    next: trial.differ.find((d) => d.case === c.id)?.next.says ?? "",
  }));
  const diffCols: TableColumn<DiffRow>[] = [
    {
      key: "what",
      header: "Case",
      width: proportional(2, { minWidth: isNarrow ? 88 : 140 }),
      renderCell: ({ what }) => <Text>{what}</Text>,
    },
    {
      key: "now",
      header: `${names.now} did`,
      width: proportional(2, { minWidth: isNarrow ? 88 : 140 }),
      renderCell: ({ now }) => <Text color="secondary">{now}</Text>,
    },
    {
      key: "next",
      header: `${names.next} would`,
      width: proportional(2, { minWidth: isNarrow ? 88 : 140 }),
      renderCell: ({ next }) => <Text color="secondary">{next}</Text>,
    },
  ];
  const part = lines[0]?.now.text ?? "";
  const share = lines.find((l) => l.id === "work")?.now.text ?? "";
  const choose = (which: "now" | "next") => {
    setChosen(which);
    showToast({
      body:
        which === "now"
          ? `Kept ${number(names.now)}. ${names.next} is set aside, as a case for next time.`
          : `Using ${number(names.next)}. Save it to make it so.`,
      uniqueID: which,
    });
  };
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={4}>
          <HStack gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={0.5}>
                <Heading level={2}>
                  {names.now} or {names.next.toLowerCase()}
                </Heading>
                <Text type="supporting" color="secondary">
                  Both tried on the same {trial.now.of} past cases, sending nothing. {part} was the weakest part this week: {share}.
                </Text>
              </VStack>
            </StackItem>
            {chosen === null ? (
              <HStack gap={2}>
                <Button label={`Keep ${number(names.now)}`} variant="secondary" onClick={() => choose("now")} />
                <Button label={`Use ${number(names.next)}`} variant="primary" onClick={() => choose("next")} />
              </HStack>
            ) : (
              <Text type="supporting" color="secondary">
                {chosen === "now" ? `Kept ${number(names.now)}` : `Using ${number(names.next)}`}
              </Text>
            )}
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={6}>
            <Card padding={isNarrow ? 3 : 5} style={FRAME}>
              <Table<Row>
                data={grouped.data}
                columns={columns}
                idKey={grouped.idKey}
                density="spacious"
                dividers="rows"
                plugins={{ grouped: grouped.plugin, sticky }}
              />
            </Card>
            <VStack gap={3}>
              <VStack gap={0}>
                <Heading level={3} accessibilityLevel={2}>
                  Where they differ
                </Heading>
                <Text type="supporting" color="secondary">
                  {differ.length} of the {trial.now.of}. On the other {trial.now.of - differ.length} they did the same.
                </Text>
              </VStack>
              <Card padding={isNarrow ? 3 : 5} style={FRAME}>
                <Table<DiffRow> data={differ} columns={diffCols} idKey="id" dividers="rows" density="compact" verticalAlign="top" />
              </Card>
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}

export default function ComparePage({ params }: PageProps) {
  const manager = params["manager"] ?? "";
  return (
    <ManagerFrame id={manager} tab="Playbook">
      <Reading from="/m/:manager/playbook?version" parts={{ manager }} failed="We could not read the playbook">
        {({ playbook }) => (
          <Reading
            from="/m/:manager/compare/:trial"
            parts={{ manager, trial: params["trial"] ?? "" }}
            failed="We could not read the comparison"
          >
            {(view) => <Compare view={view} playbook={playbook} />}
          </Reading>
        )}
      </Reading>
    </ManagerFrame>
  );
}

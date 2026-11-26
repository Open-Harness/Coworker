// astryx-template: table-filter
import { useMemo, useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { AuditView } from "~/modules/views-workspace/types.ts";
import { capital, when } from "../format.ts";

type Line = AuditView["lines"][number];
interface Row extends Record<string, unknown> {
  readonly id: string;
  readonly when: string;
  readonly who: string;
  readonly kind: Line["kind"];
  readonly did: string;
  readonly under: string;
  readonly result: Line["outcome"];
  readonly why: string | null;
}
const WORD: Readonly<Record<Line["outcome"], string>> = { done: "Done", refused: "Refused", failed: "Failed", asked: "Asked" };
const ALL = "all";
const wrong = (r: Row): boolean => r.result === "refused" || r.result === "failed";
const underSaid = (under: Line["under"]): string =>
  under.is === "reach" ? `Reach: ${under.says}` : under.is === "may do" ? `May do: ${under.says}` : under.says;

function Audit({ lines, zone }: { readonly lines: AuditView["lines"]; readonly zone: string }) {
  const [isNarrow, clock] = [useMediaQuery("(max-width: 768px)"), useClock()];
  const [query, setQuery] = useState("");
  const [who, setWho] = useState<string>(ALL);
  const [result, setResult] = useState<string>(ALL);
  const everything = useMemo<Row[]>(
    () =>
      lines.map((l) => ({
        id: l.id,
        when: when(l.at, zone, clock),
        who: l.by,
        kind: l.kind,
        did: l.says,
        under: underSaid(l.under),
        result: l.outcome,
        why: l.why,
      })),
    [lines, zone, clock],
  );
  const rows = useMemo(
    () =>
      everything.filter(
        (e) =>
          (who === ALL || e.kind === who) &&
          (result === ALL || (result === "wrong" ? wrong(e) : e.result === result)) &&
          `${e.who} ${e.did} ${e.under}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [everything, query, who, result],
  );
  const all: TableColumn<Row>[] = [
    {
      key: "when",
      header: "When",
      width: pixel(140),
      renderCell: (r) => (
        <Text type="supporting" color="secondary" maxLines={1}>
          {r.when}
        </Text>
      ),
    },
    {
      key: "who",
      header: "Who",
      width: pixel(140),
      renderCell: (r) => (
        <Text type="body" maxLines={1}>
          {r.who}
        </Text>
      ),
    },
    {
      key: "did",
      header: "What",
      width: proportional(1.6, { minWidth: isNarrow ? 160 : 220 }),
      renderCell: (r) => (
        <VStack gap={0}>
          <Text type="body" maxLines={isNarrow ? 2 : 1}>
            {r.did}
          </Text>
          {r.why && (
            <Text type="supporting" color="secondary" maxLines={2}>
              {r.why}
            </Text>
          )}
          {isNarrow && <Text type="supporting" color="secondary" maxLines={1}>{`${r.who}, ${r.when}`}</Text>}
        </VStack>
      ),
    },
    {
      key: "under",
      header: "Under",
      width: proportional(1.2, { minWidth: 200 }),
      renderCell: (r) => (
        <Text type="supporting" color="secondary" maxLines={2}>
          {r.under}
        </Text>
      ),
    },
    {
      key: "result",
      header: isNarrow ? "" : "Result",
      width: pixel(isNarrow ? 48 : 110),
      renderCell: (r) =>
        wrong(r) ? (
          <HStack gap={2} vAlign="center">
            <StatusDot variant="error" label={WORD[r.result]} />
            {!isNarrow && <Text type="body">{WORD[r.result]}</Text>}
          </HStack>
        ) : (
          <Text type="supporting" color="secondary">
            {isNarrow ? "" : WORD[r.result]}
          </Text>
        ),
    },
  ];
  const columns = isNarrow ? all.filter((c) => ["did", "result"].includes(c.key as string)) : all;
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider={false} padding={4}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <TextInput
                label="Search"
                isLabelHidden
                placeholder="Search who, what or permission"
                value={query}
                onChange={(v: string) => setQuery(v)}
              />
            </StackItem>
            <Selector
              label="Who"
              isLabelHidden
              value={who}
              onChange={(v) => setWho(v ?? ALL)}
              options={[
                { value: ALL, label: "Everyone" },
                { value: "person", label: "People" },
                { value: "coworker", label: "Juno" },
                { value: "manager", label: "Managers" },
              ]}
            />
            <Selector
              label="Result"
              isLabelHidden
              value={result}
              onChange={(v) => setResult(v ?? ALL)}
              options={[
                { value: ALL, label: "Any result" },
                { value: "wrong", label: "Went wrong" },
                { value: "refused", label: capital("refused") },
                { value: "failed", label: "Failed" },
                { value: "done", label: "Done" },
              ]}
            />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={0}>
          <Table<Row> data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" textOverflow="truncate" hasHover />
        </LayoutContent>
      }
    />
  );
}

/** Everything a person, Juno or a manager did, and the permission it did it under. Only what went wrong has a colour. */
export default function AuditLog() {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return <Reading from="/settings/audit-log?by&outcome&before">{(view) => <Audit lines={view.lines} zone={zone} />}</Reading>;
}

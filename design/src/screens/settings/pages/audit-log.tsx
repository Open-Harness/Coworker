// astryx-template: table-filter
import { useMemo, useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { AUDIT, type Entry } from "../facts/audit";

export const meta = { fills: true };
type Row = Entry & Record<string, unknown>;
const WORD = { done: "Done", refused: "Refused", failed: "Failed" } as const;
const ALL = "all";

/** Everything a person, Juno or a manager did, and the permission it did it under. Only what went wrong has a colour. */
export default function AuditLog({ onDirty }: { onDirty: () => void }) {
  void onDirty;
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [query, setQuery] = useState("");
  const [who, setWho] = useState<string>(ALL);
  const [result, setResult] = useState<string>(ALL);
  const rows = useMemo(() => AUDIT.filter((e) => (who === ALL || e.kind === who) && (result === ALL || (result === "wrong" ? e.result !== "done" : e.result === result))
    && `${e.who} ${e.did} ${e.under}`.toLowerCase().includes(query.toLowerCase())).map((e) => ({ ...e })), [query, who, result]);
  const wrong = (r: Row) => r.result !== "done";
  const all: TableColumn<Row>[] = [
    { key: "when", header: "When", width: pixel(140), renderCell: (r) => <Text type="supporting" color="secondary" maxLines={1}>{r.when}</Text> },
    { key: "who", header: "Who", width: pixel(140), renderCell: (r) => <Text type="body" maxLines={1}>{r.who}</Text> },
    { key: "did", header: "What", width: proportional(1.6, { minWidth: isNarrow ? 160 : 220 }), renderCell: (r) => <VStack gap={0}><Text type="body" maxLines={isNarrow ? 2 : 1}>{r.did}</Text>{r.why && <Text type="supporting" color="secondary" maxLines={2}>{r.why}</Text>}{isNarrow && <Text type="supporting" color="secondary" maxLines={1}>{`${r.who}, ${r.when}`}</Text>}</VStack> },
    { key: "under", header: "Under", width: proportional(1.2, { minWidth: 200 }), renderCell: (r) => <Text type="supporting" color="secondary" maxLines={2}>{r.under}</Text> },
    { key: "result", header: isNarrow ? "" : "Result", width: pixel(isNarrow ? 48 : 110), renderCell: (r) => wrong(r) ? <HStack gap={2} vAlign="center"><StatusDot variant="error" label={WORD[r.result]} />{!isNarrow && <Text type="body">{WORD[r.result]}</Text>}</HStack> : <Text type="supporting" color="secondary">{isNarrow ? "" : WORD[r.result]}</Text> },
  ];
  const columns = isNarrow ? all.filter((c) => ["did", "result"].includes(c.key as string)) : all;
  return (
    <Layout height="fill"
      header={
        <LayoutHeader hasDivider={false} padding={4}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <StackItem size="fill"><TextInput label="Search" isLabelHidden placeholder="Search who, what or permission" value={query} onChange={(v: string) => setQuery(v)} /></StackItem>
            <Selector label="Who" isLabelHidden value={who} onChange={(v) => setWho(v ?? ALL)} options={[{ value: ALL, label: "Everyone" }, { value: "Person", label: "People" }, { value: "Juno", label: "Juno" }, { value: "Manager", label: "Managers" }]} />
            <Selector label="Result" isLabelHidden value={result} onChange={(v) => setResult(v ?? ALL)} options={[{ value: ALL, label: "Any result" }, { value: "wrong", label: "Went wrong" }, { value: "refused", label: "Refused" }, { value: "failed", label: "Failed" }, { value: "done", label: "Done" }]} />
          </HStack>
        </LayoutHeader>
      }
      content={<LayoutContent role="main" padding={0}><Table<Row> data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" textOverflow="truncate" hasHover /></LayoutContent>}
    />
  );
}

// astryx-template: settings
import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { go } from "../../../shell";
import { LIMIT } from "../../settings/facts/money";
import { SPEND } from "../facts";

export const meta = { save: true };
interface Row extends Record<string, unknown> { id: string; name: string; part: string; piece: string; avg: number; week: number }
const num = (s: string) => { const n = Number(s); return Number.isFinite(n) && n >= 0 ? n : 0; };

/** The whole limit is the one in Settings. Juno hands it out in parts, and the parts cannot come to more than the whole. */
export default function Spending({ onDirty }: { onDirty: () => void }) {
  const isNarrow = useMediaQuery("(max-width: 768px)");
  const [rows, setRows] = useState<Row[]>(() => SPEND.map((s) => ({ id: s.id, name: s.name, part: String(s.part), piece: String(s.piece), avg: s.avg, week: s.week })));
  const handed = rows.reduce((a, r) => a + num(r.part), 0);
  const over = handed - LIMIT;
  const edit = (id: string, key: "part" | "piece", v: string) => { setRows((x) => x.map((r) => (r.id === id ? { ...r, [key]: v } : r))); if (over <= 0) onDirty(); };
  const cols: TableColumn<Row>[] = [
    { key: "name", header: "Manager", width: proportional(1, { minWidth: 110 }), renderCell: (r) => <Text type="body" maxLines={1}>{r.name}</Text> },
    { key: "part", header: "A day", width: pixel(isNarrow ? 92 : 130), renderCell: (r) => <TextInput label={`${r.name}, a day`} isLabelHidden value={r.part} onChange={(v: string) => edit(r.id, "part", v)} /> },
    { key: "used", header: "Used a day", width: proportional(1, { minWidth: isNarrow ? 80 : 140 }), renderCell: (r) => <VStack gap={1}><Text type="body">{`$${r.avg.toFixed(1)}`}</Text><ProgressBar label={`${r.name} used`} isLabelHidden value={r.avg} max={Math.max(num(r.part), 1)} variant={r.avg > num(r.part) ? "error" : "neutral"} /></VStack> },
    { key: "piece", header: "Per piece of work", width: pixel(130), renderCell: (r) => <TextInput label={`${r.name}, per piece of work`} isLabelHidden value={r.piece} onChange={(v: string) => edit(r.id, "piece", v)} /> },
  ];
  const columns = isNarrow ? cols.filter((c) => c.key !== "piece") : cols;
  return (
    <VStack gap={4}>
      <VStack gap={1}>
        <Text type="body">{`$${handed} of the $${LIMIT} a day is handed out.`}</Text>
        <Text type="supporting" color="secondary">All amounts are dollars. Used a day is the average of the last 7 days. A piece of work stops at its own limit and asks.</Text>
        <HStack><Button label="Change the $100 in Settings, General" size="sm" variant="ghost" onClick={() => go("set-general")} /></HStack>
      </VStack>
      {over > 0 && <Banner status="error" title={`That is $${over} too much`} description={`The parts come to $${handed}, and the whole is $${LIMIT}. Take $${over} from one of them. It cannot be saved like this.`} />}
      <Table<Row> data={rows} columns={columns} idKey="id" density="balanced" dividers="rows" />
      <Text type="supporting" color="secondary">Docs and Releases work under Coding, and WhatsApp desk under Support. Each has a part of its own, and a manager above cannot spend a part below it.</Text>
    </VStack>
  );
}

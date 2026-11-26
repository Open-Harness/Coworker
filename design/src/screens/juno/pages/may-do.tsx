// astryx-template: settings
import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { Part } from "../../../part";
import { MAY_DO, type May, type Say } from "../facts";

export const meta = { save: true };
type Row = May & Record<string, unknown>;
const OPTIONS = [{ value: "on", label: "On" }, { value: "ask", label: "Ask" }, { value: "off", label: "Off" }];

/** What Juno itself may do, as itself. It may ask for more here, and never gives itself more: a person says yes. */
export default function MayDo({ onDirty }: { onDirty: () => void }) {
  const [say, setSay] = useState<Record<string, Say>>(() => Object.fromEntries(MAY_DO.flatMap((g) => g.rows.map((r) => [r.id, r.say]))));
  const cols: TableColumn<Row>[] = [
    { key: "what", header: "Juno may", width: proportional(1.4, { minWidth: 170 }), renderCell: (r) => <Text type="body" maxLines={2}>{r.what}</Text> },
    { key: "say", header: "Says", width: pixel(104), renderCell: (r) => <Selector label={r.what} isLabelHidden size="sm" value={say[r.id] ?? "ask"} options={OPTIONS} onChange={(v) => { if (v) { setSay((x) => ({ ...x, [r.id]: v as Say })); onDirty(); } }} /> },
    { key: "from", header: "From", width: proportional(1, { minWidth: 120 }), renderCell: (r) => <Text type="supporting" color="secondary" maxLines={1}>{r.from}</Text> },
  ];
  return (
    <>
      {MAY_DO.map((g, i) => (
        <VStack key={g.title} gap={4}>
          {i > 0 && <Divider />}
          <Part title={g.title} about={g.about}>
            <Table<Row> data={g.rows.map((r) => ({ ...r }))} columns={cols} idKey="id" density="balanced" dividers="rows" />
            {i === MAY_DO.length - 1 && <HStack><Text type="supporting" color="secondary">On: it does it and says so. Ask: it asks you first. Off: it does not. Juno can ask to change a line, in your inbox. It never changes one itself.</Text></HStack>}
          </Part>
        </VStack>
      ))}
    </>
  );
}

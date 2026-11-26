// astryx-template: settings
import { useState } from "react";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Part } from "../../../part";

export const meta = { save: true };
type Where = "inbox" | "mail" | "slack";
interface Kind extends Record<string, unknown> { id: string; name: string; about: string; inbox: boolean; mail: boolean; slack: boolean; locked?: boolean }
const KINDS: Kind[] = [
  { id: "waits", name: "Something waits for you", about: "A question, an approval, a review", inbox: true, mail: true, slack: false, locked: true },
  { id: "wrong", name: "Something went wrong", about: "A manager is stuck, a number is offline, a limit is near", inbox: true, mail: true, slack: true },
  { id: "done", name: "Work you asked for is done", about: "The result, once", inbox: true, mail: false, slack: false },
  { id: "propose", name: "Juno proposes a change", about: "Before it tries one, and what it found", inbox: true, mail: false, slack: false },
  { id: "week", name: "The week, in a page", about: "Mondays, 07:30", inbox: true, mail: true, slack: false },
];

export default function Notifications({ onDirty }: { onDirty: () => void }) {
  const [rows, setRows] = useState<Kind[]>(KINDS);
  const [from, setFrom] = useState("20:00");
  const [to, setTo] = useState("07:00");
  const [night, setNight] = useState(true);
  const [wrongToo, setWrongToo] = useState(true);
  const set = (id: string, w: Where, v: boolean) => { setRows((x) => x.map((r) => (r.id === id ? { ...r, [w]: v } : r))); onDirty(); };
  const box = (w: Where, label: string): TableColumn<Kind> => ({ key: w, header: label, width: pixel(76), renderCell: (r) => <CheckboxInput label={`${r.name}, ${label}`} isLabelHidden value={r[w] as boolean} isDisabled={r.locked === true && w === "inbox"} onChange={(v: boolean) => set(r.id, w, v)} /> });
  const cols: TableColumn<Kind>[] = [
    { key: "name", header: "Tell me when", width: proportional(1, { minWidth: 180 }), renderCell: (r) => <VStack gap={0}><Text type="body">{r.name}</Text><Text type="supporting" color="secondary">{r.about}</Text></VStack> },
    box("inbox", "Inbox"), box("mail", "Mail"), box("slack", "Slack"),
  ];
  return (
    <>
      <Part title="What reaches you" about="Your inbox always has it. Mail goes to ama@acme.co. Slack is a message from Juno to you.">
        <Table<Kind> data={rows} columns={cols} idKey="id" density="balanced" dividers="rows" />
      </Part>
      <Divider />
      <Part title="When not" about="Mail and Slack wait until the morning. Your inbox still fills.">
        <CheckboxInput label="Keep mail and Slack quiet at night" description="Your time zone: Copenhagen." value={night} onChange={(v: boolean) => { setNight(v); onDirty(); }} />
        <TextInput label="From" value={from} isDisabled={!night} onChange={(v: string) => { setFrom(v); onDirty(); }} />
        <TextInput label="Until" value={to} isDisabled={!night} onChange={(v: string) => { setTo(v); onDirty(); }} />
        <CheckboxInput label="Still tell me at night when something went wrong" value={wrongToo} isDisabled={!night} onChange={(v: boolean) => { setWrongToo(v); onDirty(); }} />
      </Part>
    </>
  );
}

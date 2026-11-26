import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";
import { BEGAN, CADENCE, LOST, TODAY, WANTS, type Want } from "./data";

type State = "has" | "no" | "on" | "asked" | "skipped";
/** What Juno would like to read before it drafts. Each says what it reads, what it tells, and what is missing without it. */
export function Connect() {
  const showToast = useToast();
  const [state, setState] = useState<Readonly<Record<string, State>>>({ mail: "has", crm: "on", calendar: "asked", calls: "skipped" });
  const set = (w: Want, s: State) => { setState((x) => ({ ...x, [w.id]: s })); if (s === "on" || s === "asked") showToast({ body: s === "asked" ? `Bo is asked to sign in to ${w.name.replace("Bo’s ", "the ")}` : `${w.name}: to read only, until the draft is made or thrown away`, uniqueID: w.id }); };
  const label: Readonly<Record<State, string>> = { has: "Connected", on: "To read only", asked: "Asked Bo", skipped: "Skipped", no: "" };
  return (
    <List density="balanced" hasDividers>
      {WANTS.map((w) => {
        const s = state[w.id] ?? "no";
        return (
          <ListItem key={w.id} label={<HStack gap={2} vAlign="center" wrap="wrap"><Text type="label">{w.name}</Text>{s !== "no" && <Token size="sm" color={s === "asked" ? "yellow" : "gray"} label={label[s]} />}</HStack>}
            description={<VStack gap={0}><Text type="supporting" color="secondary">Reads: {w.reads}</Text><Text type="supporting" color="secondary">Tells me: {w.tells}</Text>{w.without && <Text type="supporting" color="secondary">Without it: {w.without}</Text>}</VStack>}
            endContent={s === "has" ? undefined : s === "no" || s === "skipped" ? <HStack gap={1}><Button label={w.who ? "Ask Bo" : "Connect"} aria-label={`Connect ${w.name}`} size="sm" variant="secondary" onClick={() => set(w, w.who ? "asked" : "on")} />{s === "no" && <Button label="Skip" aria-label={`Skip ${w.name}`} size="sm" variant="ghost" onClick={() => set(w, "skipped")} />}</HStack> : <Button label="Undo" aria-label={`Undo ${w.name}`} size="sm" variant="ghost" onClick={() => set(w, "no")} />} />
        );
      })}
    </List>
  );
}

/** A finding, where it was read, and room to say that it is wrong. */
function Finding({ title, from, children }: { title: string; from: string; children: React.ReactNode }) {
  const showToast = useToast();
  const [isWrong, setWrong] = useState(false); const [text, setText] = useState("");
  return (
    <VStack gap={3}>
      <HStack gap={2} vAlign="start"><StackItem size="fill"><VStack gap={0}><Heading level={3}>{title}</Heading><Text type="supporting" color="secondary">{from}</Text></VStack></StackItem>{!isWrong && <Button label="Not right" style={{ flexShrink: 0 }} aria-label={`Not right: ${title}`} size="sm" variant="ghost" onClick={() => setWrong(true)} />}</HStack>
      {children}
      {isWrong && <VStack gap={2}><TextArea label="What is wrong?" rows={2} value={text} onChange={(v: string) => setText(v)} /><HStack gap={2}><Button label="Tell Juno" size="sm" variant="secondary" onClick={() => { setWrong(false); showToast({ body: "Juno looks again, and changes the draft.", uniqueID: title }); }} /><Button label="Cancel" size="sm" variant="ghost" onClick={() => setWrong(false)} /></HStack></VStack>}
    </VStack>
  );
}
interface Cad extends Record<string, unknown> { id: string; c: readonly [string, string, string, string] }
const COLS: TableColumn<Cad>[] = [
  { key: "a", header: "Look", width: proportional(2, { minWidth: 130 }), renderCell: (r) => <HStack gap={2} vAlign="center"><Text>{r.c[0]}</Text>{r.id === "Weekdays, 07:00" && <Token size="sm" color="gray" label="Juno’s pick" />}</HStack> },
  { key: "b", header: "Finds", width: pixel(72), align: "end", renderCell: (r) => <Text hasTabularNumbers>{r.c[1]}</Text> },
  { key: "d", header: "When", width: pixel(112), renderCell: (r) => <Text color="secondary">{r.c[2]}</Text> },
  { key: "e", header: "Cost", width: pixel(72), align: "end", renderCell: (r) => <Text hasTabularNumbers>{r.c[3]}</Text> },
];
export function Found() {
  return (
    <VStack gap={8}>
      <Finding title="Most wins began with a change at the company" from="CRM, the 46 deals won this year, and the note on each">
        <VStack gap={3}>{BEGAN.map(([t, n]) => <ProgressBar key={t} label={t} value={n} max={46} hasValueLabel formatValueLabel={(v) => `${v} of 46`} />)}</VStack>
      </Finding>
      <Finding title="Leads are lost while they wait" from="Mail and CRM, the 96 people who wrote in 30 days">
        <VStack gap={3}>{LOST.map(([t, n, note]) => <VStack key={t} gap={0.5}><ProgressBar label={t} value={n} max={96} hasValueLabel formatValueLabel={(v) => String(v)} />{note && <Text type="supporting" color="secondary">{note}</Text>}</VStack>)}</VStack>
      </Finding>
      <Finding title="How Bo does it today" from="Mail, CRM, and what Bo told Ama"><Text type="body">{TODAY}</Text></Finding>
      <Finding title="Once a day is often enough to look" from="The same search, tried on the last 30 days"><Table<Cad> data={CADENCE.map((c) => ({ id: c[0], c }))} columns={COLS} idKey="id" density="compact" dividers="rows" /></Finding>
      <Finding title="What I could not know" from="Skipped, or not there"><Text type="body">What makes a call good, from the calls themselves. I start from what Bo marks, and say so in the draft.</Text></Finding>
    </VStack>
  );
}

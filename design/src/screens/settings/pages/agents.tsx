// astryx-template: table
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Token } from "@astryxdesign/core/Token";
import { go } from "../../../shell";
import { ModelPicker } from "../../../model-picker";
import { SAVED, type Saved } from "../parts/agents";
import { useOpenRow } from "../parts/rows";
import { Split } from "../parts/split";

export const meta = { save: true };

function Detail({ a, told, model, onTold, onModel }: { a: Saved; told: string; model: string; onTold: (v: string) => void; onModel: (v: string) => void }) {
  const l = a.line;
  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill"><VStack gap={0.5}><Heading level={3} accessibilityLevel={3}>{l.name}</Heading><Text type="supporting" color="secondary">{l.is}</Text></VStack></StackItem>
        <Button label="Use it in a manager" variant="secondary" size="sm" onClick={() => go("soon-Use an agent")} />
      </HStack>
      <MetadataList columns={2}>
        <MetadataListItem label="Saved by">{a.saved}</MetadataListItem>
        <MetadataListItem label="Made in">{a.from}</MetadataListItem>
        <MetadataListItem label="Used by">{a.usedBy.join(", ")}</MetadataListItem>
        <MetadataListItem label="Tools">{l.tools}</MetadataListItem>
        <MetadataListItem label="Measure">{l.good}: {l.first} at first, {l.now} now, the line is {l.line}</MetadataListItem>
      </MetadataList>
      <TextArea label="What it is told" description="Each manager that uses it keeps its own copy once it is put in, and can change it there." rows={6} value={told} onChange={onTold} />
      <VStack gap={1}><ModelPicker inherit={false} value={model} onChange={onModel} /><Text type="supporting" color="secondary">Its own. A manager may choose another for its copy, and a template names none.</Text></VStack>
      <VStack gap={1}><Text type="label">Skills</Text><HStack gap={1} wrap="wrap">{l.skills.map((s) => <Token key={s} size="sm" label={s} />)}</HStack></VStack>
    </VStack>
  );
}

/** Roles that were saved to use again, from any manager. */
export default function Agents({ onDirty }: { onDirty: () => void }) {
  const [open, setOpen] = useState<string | null>(useMediaQuery("(max-width: 1100px)") ? null : "checker");
  const [told, setTold] = useState<Record<string, string>>(() => Object.fromEntries(SAVED.map((a) => [a.id, a.line.told])));
  const [model, setModel] = useState<Record<string, string>>(() => Object.fromEntries(SAVED.map((a) => [a.id, a.line.model])));
  const row = useOpenRow<Saved>(open, (a) => setOpen(a.id));
  const a = SAVED.find((x) => x.id === open);
  const cols: TableColumn<Saved>[] = [
    { key: "name", header: "Agent", width: proportional(2, { minWidth: 150 }), renderCell: (x) => <VStack gap={0}><Text type="label" maxLines={1}>{x.line.name}</Text><Text type="supporting" color="secondary" maxLines={2}>{x.line.is}</Text></VStack> },
    { key: "from", header: "From", width: pixel(96), renderCell: (x) => <Text maxLines={1}>{x.from}</Text> },
  ];
  const list = (
    <VStack gap={3}>
      <VStack gap={0.5}><Heading level={3} accessibilityLevel={2}>Agents</Heading><Text type="supporting" color="secondary">Roles that were saved to use again. A manager’s own agents are in its playbook.</Text></VStack>
      <Table<Saved> data={[...SAVED]} columns={cols} idKey="id" density="compact" dividers="rows" verticalAlign="top" plugins={{ row }} />
    </VStack>
  );
  return <Split list={list} width={360} back={{ label: "All agents", onBack: () => setOpen(null) }}
    detail={a ? <Detail a={a} told={told[a.id] ?? ""} model={model[a.id] ?? a.line.model} onTold={(v) => { setTold((t) => ({ ...t, [a.id]: v })); onDirty(); }} onModel={(v) => { setModel((m) => ({ ...m, [a.id]: v })); onDirty(); }} /> : null} />;
}

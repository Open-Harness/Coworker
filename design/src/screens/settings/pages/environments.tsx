// astryx-template: detail-page
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { ENVS, SIZES, type Env, type Start } from "../parts/envs";
import { useOpenRow } from "../parts/rows";
import { Split } from "../parts/split";

export const meta = { save: true };
const last = (e: Env) => e.starts[0];

function Detail({ e, script, size, onScript, onSize }: { e: Env; script: string; size: string; onScript: (v: string) => void; onSize: (v: string) => void }) {
  const toast = useToast();
  const [isEditing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [names, setNames] = useState<readonly { name: string; changed: string }[]>(e.secrets);
  const starts: TableColumn<Start>[] = [
    { key: "at", header: "Started", width: proportional(2, { minWidth: 110 }), renderCell: (s) => <Text hasTabularNumbers>{s.at}</Text> },
    { key: "took", header: "Took", width: pixel(80), align: "end", renderCell: (s) => <Text color="secondary" hasTabularNumbers>{s.took}</Text> },
    { key: "ok", header: "Ended", width: proportional(3, { minWidth: 120 }), renderCell: (s) => <HStack gap={1.5} vAlign="center"><StatusDot variant={s.ok ? "neutral" : "error"} label={s.ok ? "Ok" : "Failed"} /><Text maxLines={2} color={s.ok ? "secondary" : "primary"}>{s.ok ? "Ok" : (s.why ?? "Failed")}</Text></HStack> },
  ];
  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill"><VStack gap={0.5}><Heading level={3} accessibilityLevel={3}>{e.name}</Heading><Text type="supporting" color="secondary">{e.about}</Text></VStack></StackItem>
        <Button label="Start one to try" variant="secondary" size="sm" onClick={() => toast({ body: `${e.name} started in ${e.starts[0]?.took ?? "a few seconds"}`, uniqueID: e.id })} />
      </HStack>
      <MetadataList columns={2}>
        <MetadataListItem label="Used by">{e.usedBy.join(", ")}</MetadataListItem>
        <MetadataListItem label="Last start">{last(e)?.at}, {last(e)?.ok ? "ok" : "failed"}</MetadataListItem>
      </MetadataList>
      <Selector label="Size" description="What a thread gets while it works here." value={size} onChange={onSize} options={SIZES.map((s) => ({ value: s, label: s }))} />
      <Divider />
      <VStack gap={2}>
        <HStack gap={2} vAlign="center"><StackItem size="fill"><VStack gap={0.5}><Text type="label">Set-up script</Text><Text type="supporting" color="secondary">Runs once on each start, before a thread does anything.</Text></VStack></StackItem><StackItem size="static"><Button label={isEditing ? "Done" : "Edit"} variant="ghost" size="sm" onClick={() => setEditing(!isEditing)} /></StackItem></HStack>
        {isEditing ? <TextArea label="Set-up script" isLabelHidden rows={6} value={script} onChange={onScript} /> : script.trim() === "" ? <Text color="secondary">Nothing. It starts as it is.</Text> : <CodeBlock code={script} language="bash" size="sm" width="100%" hasLanguageLabel={false} />}
      </VStack>
      <Divider />
      <VStack gap={2}>
        <VStack gap={0.5}><Text type="label">Secrets</Text><Text type="supporting" color="secondary">By name only. A value is opened for one call and is never shown, here or to a thread.</Text></VStack>
        {names.length === 0 ? <Text color="secondary">None.</Text> : names.map((n) => (
          <HStack key={n.name} gap={2} vAlign="center"><StackItem size="fill"><VStack gap={0}><Text>{n.name}</Text><Text type="supporting" color="secondary">Changed {n.changed}</Text></VStack></StackItem><Button label="Take it away" variant="ghost" size="sm" onClick={() => setNames((l) => l.filter((x) => x.name !== n.name))} /></HStack>
        ))}
        <HStack gap={2} vAlign="end"><StackItem size="fill"><TextInput label="Add a secret, by name" placeholder="SENTRY_AUTH_TOKEN" value={name} onChange={setName} /></StackItem><Button label="Add" variant="secondary" isDisabled={name.trim() === ""} onClick={() => { setNames((l) => [...l, { name: name.trim(), changed: "25 Nov" }]); setName(""); toast({ body: "Added. Put its value in Keys", uniqueID: "secret" }); }} /></HStack>
      </VStack>
      <Divider />
      <VStack gap={2}><Text type="label">Last starts</Text><Table<Start> data={[...e.starts]} columns={starts} idKey="at" density="compact" dividers="rows" verticalAlign="top" /></VStack>
    </VStack>
  );
}

/** Where threads run, for every manager: a set-up, secrets by name, a size, and how it started. */
export default function Environments({ onDirty }: { onDirty: () => void }) {
  const [open, setOpen] = useState<string | null>(useMediaQuery("(max-width: 1100px)") ? null : "web");
  const [script, setScript] = useState<Record<string, string>>(() => Object.fromEntries(ENVS.map((e) => [e.id, e.script])));
  const [size, setSize] = useState<Record<string, string>>(() => Object.fromEntries(ENVS.map((e) => [e.id, e.size])));
  const row = useOpenRow<Env>(open, (e) => setOpen(e.id));
  const e = ENVS.find((x) => x.id === open);
  const cols: TableColumn<Env>[] = [
    { key: "name", header: "Environment", width: proportional(2, { minWidth: 150 }), renderCell: (x) => <VStack gap={0}><Text type="label" maxLines={1}>{x.name}</Text><Text type="supporting" color="secondary" maxLines={1}>{x.usedBy.join(", ")}</Text></VStack> },
    { key: "last", header: "Last start", width: pixel(100), align: "end", renderCell: (x) => <HStack gap={1.5} vAlign="center" hAlign="end"><StatusDot variant={last(x)?.ok ? "neutral" : "error"} label={last(x)?.ok ? "Ok" : "Failed"} /><Text color="secondary" hasTabularNumbers>{last(x)?.at.slice(-5)}</Text></HStack> },
  ];
  const list = (
    <VStack gap={3}>
      <VStack gap={0.5}><Heading level={3} accessibilityLevel={2}>Environments</Heading><Text type="supporting" color="secondary">Where threads run. A manager picks one, and every thread gets its own copy.</Text></VStack>
      <Table<Env> data={[...ENVS]} columns={cols} idKey="id" density="compact" dividers="rows" verticalAlign="top" plugins={{ row }} />
    </VStack>
  );
  return <Split list={list} width={360} back={{ label: "All environments", onBack: () => setOpen(null) }}
    detail={e ? <Detail key={e.id} e={e} script={script[e.id] ?? ""} size={size[e.id] ?? e.size} onScript={(v) => { setScript((s) => ({ ...s, [e.id]: v })); onDirty(); }} onSize={(v) => { setSize((s) => ({ ...s, [e.id]: v })); onDirty(); }} /> : null} />;
}

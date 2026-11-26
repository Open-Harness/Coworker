// astryx-template: table
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import { LAYERS, SKILLS, type Skill } from "../../playbook/data";
import { VOICE, VOICE_FILES } from "../../playbook/voice";
import { EXTRA, type Run } from "../parts/skills";
import { useOpenRow } from "../parts/rows";
import { Split } from "../parts/split";

interface Row extends Record<string, unknown> { id: string; s: Skill }
const generic = (s: Skill) => `# ${s.name}\n\n${s.says}.\n\nThe words of this one are not in this drawing.`;

function Detail({ s }: { s: Skill }) {
  const x = EXTRA[s.id] ?? { versions: [], cases: [], users: [] };
  const isNarrow = useMediaQuery("(max-width: 1250px)");
  const files: Readonly<Record<string, string>> = s.id === "bos-voice" ? { "SKILL.md": VOICE, ...VOICE_FILES } : { "SKILL.md": generic(s) };
  const [file, setFile] = useState("SKILL.md");
  const items: TreeListItemData[] = Object.keys(files).map((f) => ({ id: f, label: f, isSelected: f === file, onClick: () => setFile(f) }));
  const runs: TableColumn<Run>[] = [
    { key: "what", header: "Case", width: proportional(2, { minWidth: 120 }), renderCell: (c) => <Text maxLines={2}>{c.what}</Text> },
    { key: "without", header: "Without it", width: proportional(1, { minWidth: 100 }), renderCell: (c) => <Text color="secondary" maxLines={2}>{c.without}</Text> },
    { key: "with", header: "With it", width: proportional(1, { minWidth: 100 }), renderCell: (c) => <Text maxLines={2} weight={c.with !== c.without ? "semibold" : "normal"}>{c.with}</Text> },
  ];
  return (
    <VStack gap={4}>
      <VStack gap={0.5}><HStack gap={2} vAlign="center"><Heading level={3} accessibilityLevel={3}>{s.name}</Heading><Token size="sm" label={s.layer} /></HStack><Text type="supporting" color="secondary">{s.says}</Text></VStack>
      <MetadataList columns={isNarrow ? 1 : 2}>
        <MetadataListItem label="From">{s.from}</MetadataListItem>
        <MetadataListItem label="Version">{x.versions[0] ? `${x.versions[0].n}, ${x.versions[0].when}` : "1"}</MetadataListItem>
        {s.with ? <MetadataListItem label="Without it, with it">{s.without}, {s.with}{s.cut ? ". Left out: it changed nothing" : ""}</MetadataListItem> : null}
      </MetadataList>
      <Divider />
      <VStack gap={2}><Text type="label">Files</Text>
        <HStack gap={4} vAlign="start" wrap={isNarrow ? "wrap" : "nowrap"}>
          <VStack width={isNarrow ? "100%" : 170}><TreeList items={items} density="compact" /></VStack>
          <StackItem size="fill"><Markdown headingLevelStart={4}>{files[file] ?? ""}</Markdown></StackItem>
        </HStack>
      </VStack>
      <Divider />
      <VStack gap={2}><Text type="label">Versions</Text>
        {x.versions.map((ver) => <HStack key={ver.n} gap={3} vAlign="start"><Text hasTabularNumbers weight="semibold">{ver.n}</Text><StackItem size="fill"><VStack gap={0}><Text>{ver.says}</Text><Text type="supporting" color="secondary">{ver.by}, {ver.when}</Text></VStack></StackItem></HStack>)}
      </VStack>
      {s.layer === "Craft" ? (<><Divider /><VStack gap={2}><VStack gap={0.5}><Text type="label">The same cases, with it and without it</Text><Text type="supporting" color="secondary">It stays only if more come out right with it than without.</Text></VStack><Table<Run> data={[...x.cases]} columns={runs} idKey="what" density="compact" dividers="rows" verticalAlign="top" /></VStack></>) : null}
      <Divider />
      <VStack gap={1}><Text type="label">Who uses it</Text>{x.users.length === 0 ? <Text color="secondary">Nobody.</Text> : <HStack gap={1} wrap="wrap">{x.users.map((u) => <Token key={u.manager + u.agent} size="sm" label={`${u.manager}: ${u.agent}`} />)}</HStack>}</VStack>
    </VStack>
  );
}

/** The library, in four layers. A skill never allows anything: that is Reach. */
export default function Skills() {
  const [open, setOpen] = useState<string | null>(useMediaQuery("(max-width: 1100px)") ? null : "bos-voice");
  const row = useOpenRow<Row>(open, (r) => setOpen(r.id));
  const s = SKILLS.find((x) => x.id === open);
  const cols: TableColumn<Row>[] = [
    { key: "name", header: "Skill", width: proportional(2, { minWidth: 150 }), renderCell: ({ s: k }) => <VStack gap={0}><Text type="label" maxLines={1}>{k.name}</Text><Text type="supporting" color="secondary" maxLines={1}>{k.cut ? "Left out" : (EXTRA[k.id]?.users.map((u) => u.manager).filter((m, i, a) => a.indexOf(m) === i).join(", ") || "Nobody")}</Text></VStack> },
    { key: "lift", header: "Without, with", width: pixel(116), align: "end", renderCell: ({ s: k }) => <Text hasTabularNumbers color="secondary" maxLines={2}>{k.with ? `${k.without}, ${k.with}` : ""}</Text> },
  ];
  const list = (
    <VStack gap={4}>
      <VStack gap={0.5}><Heading level={3} accessibilityLevel={2}>Skills</Heading><Text type="supporting" color="secondary">How things are done well, in four layers. Every manager takes from here, and keeps its own on top.</Text></VStack>
      <HStack><Button label="Add a skill" variant="secondary" onClick={() => setOpen("objections")} /></HStack>
      {LAYERS.map(([name, about]) => (
        <VStack key={name} gap={1}>
          <VStack gap={0}><Text type="label">{name}</Text><Text type="supporting" color="secondary">{about}</Text></VStack>
          <Table<Row> data={SKILLS.filter((k) => k.layer === name).map((k) => ({ id: k.id, s: k }))} columns={cols} idKey="id" density="compact" dividers="rows" verticalAlign="top" plugins={{ row }} />
        </VStack>
      ))}
    </VStack>
  );
  return <Split list={list} width={360} back={{ label: "All skills", onBack: () => setOpen(null) }} detail={s ? <Detail key={s.id} s={s} /> : null} />;
}

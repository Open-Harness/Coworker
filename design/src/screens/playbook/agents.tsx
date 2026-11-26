import { useState } from "react";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { MultiSelector } from "@astryxdesign/core/MultiSelector";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Token } from "@astryxdesign/core/Token";
import { ModelPicker } from "../../model-picker";
import { Part } from "../../part";
import { AGENTS, SKILLS, type AgentLine } from "./data";
import { Note, useNotes } from "./notes";

const NAMES = SKILLS.filter((s) => !s.cut && (s.layer === "Craft" || s.layer === "Connector")).map((s) => ({ value: s.name, label: s.name }));
function One({ a }: { a: AgentLine }) {
  const { isDraft, change } = useNotes();
  const [told, setTold] = useState(a.told);
  const [model, setModel] = useState(a.model); const [skills, setSkills] = useState<string[]>([...a.skills]);
  return (
    <Part title={a.name} about={a.is} more={<HStack gap={1} paddingBlockStart={2} vAlign="center">{isDraft && a.has && <Token size="sm" color="gray" label="Coding’s, shared" />}<Note at={a.name} /></HStack>}>
      <MetadataList columns="single" label={{ position: "start", width: 120 }}>
        <MetadataListItem label="Good means">{a.good}</MetadataListItem>
        <MetadataListItem label={isDraft ? "On past work" : "Now"}>{isDraft ? `${a.first}, the aim is ${a.line}` : `${a.now}, the aim is ${a.line}. It began at ${a.first}`}</MetadataListItem>
        <MetadataListItem label="May use">{a.tools}</MetadataListItem>
      </MetadataList>
      <TextArea label="What it is told" rows={4} value={told} onChange={(v: string) => { setTold(v); change(); }} />
      <MultiSelector triggerDisplay="labels" label="Skills" value={skills} onChange={(v: string[]) => { setSkills(v); change(); }} options={NAMES} description="On top of the harness, and its page of the playbook" />
      <ModelPicker value={model} onChange={(v) => { setModel(v); change(); }} onThinking={change} />
    </Part>
  );
}
export function Agents() {
  return <VStack gap={5}><HStack><StackItem size="fill"><Text type="supporting" color="secondary">Who does the steps. None of them is seen outside: it is Juno who writes.</Text></StackItem></HStack>{AGENTS.map((a, i) => <VStack key={a.id} gap={5}>{i > 0 && <Divider />}<One a={a} /></VStack>)}</VStack>;
}

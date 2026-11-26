import { useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { TextArea } from "@astryxdesign/core/TextArea";
import { useToast } from "@astryxdesign/core/Toast";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import look from "../../set-up/look.md?raw";
import playbook from "../../set-up/playbook.md?raw";
import questions from "../../set-up/questions.md?raw";
import skill from "../../set-up/SKILL.md?raw";

const FILES: Readonly<Record<string, string>> = { "SKILL.md": skill.replace(/^---[\s\S]*?---\n/, ""), "questions.md": questions, "look.md": look, "playbook.md": playbook };

function Say({ file }: { file: string }) {
  const [text, setText] = useState("");
  const showToast = useToast();
  return (
    <VStack gap={2} paddingBlockStart={5}>
      <TextArea label={`Say something about ${file}`} rows={3} value={text} onChange={(v: string) => setText(v)} />
      <HStack><Button label="Comment" size="sm" variant="secondary" isDisabled={text.trim() === ""} onClick={() => { setText(""); showToast({ body: "Juno tries a change on the 6 drafts there have been, and answers here.", uniqueID: "skill" }); }} /></HStack>
    </VStack>
  );
}

/** The skill that writes walkthroughs and drafts. It is judged like any other: by what people changed. */
export function SetUpSkill() {
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const [file, setFile] = useState("SKILL.md");
  const items: TreeListItemData[] = Object.keys(FILES).map((f) => ({ id: f, label: f, isSelected: f === file, onClick: () => setFile(f) }));
  return (
    <VStack gap={4}>
      <VStack gap={0}><Heading level={3} accessibilityLevel={2}>Set up a manager</Heading><Text type="supporting" color="secondary">Juno’s own. From one sentence to a draft of everything. Say what is wrong below; Juno answers with a change.</Text></VStack>
      <MetadataList columns={isNarrow ? "single" : "multi"}>
        <MetadataListItem label="Version">14, since 2 Oct</MetadataListItem>
        <MetadataListItem label="Lines of its drafts nobody changed">83%, the aim is 75%</MetadataListItem>
        <MetadataListItem label="Questions that changed nothing">2 of 31. Both are gone since version 13</MetadataListItem>
        <MetadataListItem label="Trying now">Asking for call recordings only when there are more than 20</MetadataListItem>
      </MetadataList>
      <HStack gap={5} vAlign="start" wrap={isNarrow ? "wrap" : "nowrap"}>
        <VStack width={isNarrow ? "100%" : 180}><TreeList items={items} density="compact" /></VStack>
        <StackItem size="fill"><VStack maxWidth={760}><Markdown headingLevelStart={3}>{FILES[file]!}</Markdown><Say file={file} /></VStack></StackItem>
      </HStack>
    </VStack>
  );
}

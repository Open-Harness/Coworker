// astryx-template: ide
import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import { SKILLS } from "./data";
import { VOICE, VOICE_AFTER, VOICE_BEFORE, VOICE_FILES } from "./voice";
import { Note, useAccepted, useNotes } from "./notes";

const generic = (name: string, says: string) => `# ${name}\n\n${says}.\n\nThe words of this one are not in this drawing.`;

/** One skill: its files, its words, what it is worth. The harness and the connectors can be read, and noted on, not changed. */
export function SkillPage({ id, onBack }: { id: string; onBack: () => void }) {
  const { change, isDraft } = useNotes();
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const isAccepted = useAccepted("c4") || !isDraft;
  const s = SKILLS.find((x) => x.id === id) ?? SKILLS[1]!;
  const isVoice = s.id === "bos-voice";
  const isOurs = s.layer === "Harness" || s.layer === "Connector";
  const [file, setFile] = useState("SKILL.md");
  const [mode, setMode] = useState("read");
  const [own, setOwn] = useState<Readonly<Record<string, string>>>({});
  const files: Readonly<Record<string, string>> = isVoice ? { "SKILL.md": isAccepted ? VOICE.replace(VOICE_BEFORE, VOICE_AFTER) : VOICE, ...VOICE_FILES } : { "SKILL.md": generic(s.name, s.says) };
  const text = own[file] ?? files[file] ?? "";
  const items: TreeListItemData[] = Object.keys(files).map((f) => ({ id: f, label: f, isSelected: f === file, onClick: () => setFile(f) }));
  return (
    <VStack gap={4}>
      <HStack gap={2} vAlign="center" wrap="wrap">
        <Button label="All skills" size="sm" variant="ghost" onClick={onBack} />
        <StackItem size="fill"><Heading level={3} accessibilityLevel={2}>{s.name}</Heading></StackItem>
        <Note at={s.name} />
        {!isOurs && <SegmentedControl label="Show" value={mode} onChange={setMode} size="sm"><SegmentedControlItem value="read" label="Read" /><SegmentedControlItem value="edit" label="Edit" /></SegmentedControl>}
      </HStack>
      {s.cut && <Banner status="info" title="Juno left this one out" description="Writer did as well without it: 46 of 100 sent unchanged, both times. Use it anyway if you know why." />}
      {isOurs && <Banner status="info" title={s.layer === "Harness" ? "The same for everyone" : "Comes with the connector"} description={s.layer === "Harness" ? "You can read it. Co-worker keeps it." : "You can add notes of your own, which go on top."} />}
      <MetadataList columns={isNarrow ? "single" : "multi"}>
        <MetadataListItem label="From">{s.from}</MetadataListItem>
        <MetadataListItem label="Used by">{s.cut ? "Nobody" : s.by}</MetadataListItem>
        {s.with && <MetadataListItem label="Writing, on 40 past mails">{isVoice ? "22% unchanged without it, 46% with it" : `${s.without} without it, ${s.with} with it`}</MetadataListItem>}
        {isVoice && <MetadataListItem label="Judged by">A model that agrees with Bo 37 times of 40</MetadataListItem>}
      </MetadataList>
      <HStack gap={5} vAlign="start" wrap={isNarrow ? "wrap" : "nowrap"}>
        <VStack width={isNarrow ? "100%" : 180}><TreeList items={items} density="compact" /></VStack>
        <StackItem size="fill">
          {mode === "edit" && !isOurs ? <TextArea label={file} rows={20} value={text} onChange={(v: string) => { setOwn((o) => ({ ...o, [file]: v })); change(); }} /> : <Markdown headingLevelStart={3}>{text}</Markdown>}
          {mode === "edit" && <Text type="supporting" color="secondary">Tried on the 40 mails again when you keep it. About a minute, 60 cents.</Text>}
        </StackItem>
      </HStack>
    </VStack>
  );
}

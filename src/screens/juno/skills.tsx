import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import type { CoworkerView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "./act.ts";
import { useWords } from "./words.ts";

type SetUp = CoworkerView["setUp"];
const percent = (share: number): string => `${Math.round(share * 100)}%`;
const gone = (count: number): string => (count === 1 ? "It is" : count === 2 ? "Both are" : "All are");

/** A comment on a file is sent as a comment on that file; the page says what came of it, and keeps the text when it did not go. */
function Say({ skill, file }: { readonly skill: string; readonly file: string }) {
  const [text, setText] = useState("");
  const act = useDoing();
  return (
    <VStack gap={2} paddingBlockStart={5}>
      <TextArea label={`Say something about ${file}`} rows={3} value={text} onChange={(next: string) => setText(next)} />
      <HStack>
        <Button
          label="Comment"
          size="sm"
          variant="secondary"
          isDisabled={text.trim() === ""}
          onClick={() => void act("line.comment", { manager: skill, line: file, text: text.trim() }).then((done) => done && setText(""))}
        />
      </HStack>
    </VStack>
  );
}

/** The skill that writes walkthroughs and drafts. It is judged like any other: by what people changed. */
export function Skills({ view }: { readonly view: CoworkerView }) {
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const { date } = useWords();
  const set: SetUp = view.setUp;
  const [chosen, setChosen] = useState(set.files[0]?.name ?? "");
  const skill = view.skills.find((one) => one.id === set.skill);
  const text = set.files.find((file) => file.name === chosen)?.text ?? "";
  const items: TreeListItemData[] = set.files.map((file) => ({
    id: file.name,
    label: file.name,
    isSelected: file.name === chosen,
    onClick: () => setChosen(file.name),
  }));
  return (
    <VStack gap={4}>
      <VStack gap={0}>
        <Heading level={3} accessibilityLevel={2}>
          {skill?.name ?? set.skill}
        </Heading>
        <Text type="supporting" color="secondary">
          {`${view.identity.name}’s own. ${skill?.says ?? ""}. Say what is wrong below; ${view.identity.name} answers with a change.`}
        </Text>
      </VStack>
      <MetadataList columns={isNarrow ? "single" : "multi"}>
        <MetadataListItem label="Version">{`${set.version}, since ${date(set.since)}`}</MetadataListItem>
        <MetadataListItem label="Lines of its drafts nobody changed">{`${percent(set.unchanged.now)}, the aim is ${percent(set.unchanged.aim)}`}</MetadataListItem>
        <MetadataListItem label="Questions that changed nothing">{`${set.noChange.count} of ${set.noChange.of}. ${gone(set.noChange.count)} gone since version ${set.noChange.goneSince}`}</MetadataListItem>
        <MetadataListItem label="Trying now">{set.trying}</MetadataListItem>
      </MetadataList>
      <HStack gap={5} vAlign="start" wrap={isNarrow ? "wrap" : "nowrap"}>
        <VStack width={isNarrow ? "100%" : 180}>
          <TreeList items={items} density="compact" />
        </VStack>
        <StackItem size="fill">
          <VStack maxWidth={760}>
            <Markdown headingLevelStart={3}>{text}</Markdown>
            <Say skill={set.skill} file={chosen} />
          </VStack>
        </StackItem>
      </HStack>
    </VStack>
  );
}

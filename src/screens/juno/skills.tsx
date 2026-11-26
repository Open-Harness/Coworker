import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Markdown } from "@astryxdesign/core/Markdown";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { TreeList, type TreeListItemData } from "@astryxdesign/core/TreeList";
import type { CoworkerView } from "~/modules/views-workspace/types.ts";
import { useWords } from "./words.ts";

type SetUp = CoworkerView["setUp"];
const percent = (share: number): string => `${Math.round(share * 100)}%`;
const gone = (count: number): string => (count === 1 ? "It is" : count === 2 ? "Both are" : "All are");

/** A comment on a file is tried on every draft there has been, and Juno answers with a change. */
function Say({ file, drafts }: { readonly file: string; readonly drafts: number }) {
  const [text, setText] = useState("");
  const showToast = useToast();
  return (
    <VStack gap={2} paddingBlockStart={5}>
      <TextArea label={`Say something about ${file}`} rows={3} value={text} onChange={(next: string) => setText(next)} />
      <HStack>
        <Button
          label="Comment"
          size="sm"
          variant="secondary"
          isDisabled={text.trim() === ""}
          onClick={() => {
            setText("");
            showToast({ body: `Juno tries a change on the ${drafts} drafts there have been, and answers here.`, uniqueID: "skill" });
          }}
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
            <Say file={chosen} drafts={set.drafts} />
          </VStack>
        </StackItem>
      </HStack>
    </VStack>
  );
}

import { useState } from "react";
import { HStack, Section, StackItem, VStack } from "@astryxdesign/core/Layout";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { List } from "@astryxdesign/core/List";
import { TextInput } from "@astryxdesign/core/TextInput";
import { SECTION_PADDING, SectionHeader } from "./shared";

export type DoneItem = { id: number; text: string; done: boolean; by: string };

export function DoneWhenSection({ items, onSetDone, onAdd }: {
  items: DoneItem[]; onSetDone: (id: number, done: boolean) => void; onAdd: (text: string) => void;
}) {
  const doneCount = items.filter((i) => i.done).length;
  const [isAdding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  // On a phone who showed it moves under the line, so the line gets the row's width.
  const isPhone = useMediaQuery("(max-width: 640px)", true);
  const add = () => { if (draft.trim()) { onAdd(draft.trim()); } setDraft(""); setAdding(false); };

  return (
    <Section padding={SECTION_PADDING}>
      <VStack gap={4}>
        <SectionHeader title="Done when" action={<Button label="Add one" onClick={() => setAdding(true)} />} />
        <HStack gap={3} vAlign="center">
          <Text type="supporting" color="secondary">{doneCount} of {items.length} done</Text>
          <StackItem size="fill">
            <ProgressBar label="Done-when progress" isLabelHidden value={items.length ? (doneCount / items.length) * 100 : 0} variant="success" />
          </StackItem>
        </HStack>
        <List>
          {items.map((item) => {
            const by = <Text type="supporting" color="secondary">{item.by}</Text>;
            return (
              <CheckboxListItem
                key={item.id}
                // A node label wraps; a string label is cut to one line.
                label={<>{item.text}</>}
                isChecked={item.done}
                onCheck={(done) => onSetDone(item.id, done)}
                align={isPhone ? "first-line" : undefined}
                description={isPhone ? by : undefined}
                endContent={isPhone ? undefined : by}
              />
            );
          })}
        </List>
        {isAdding && (
          <HStack gap={2} vAlign="end" wrap="wrap">
            <StackItem size="fill">
              <TextInput label="What must be true" isLabelHidden placeholder="What must be true before this is done" value={draft} onChange={setDraft} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
            </StackItem>
            <Button label="Cancel" variant="ghost" onClick={() => { setDraft(""); setAdding(false); }} />
            <Button label="Add" variant="primary" isDisabled={draft.trim().length === 0} onClick={add} />
          </HStack>
        )}
      </VStack>
    </Section>
  );
}

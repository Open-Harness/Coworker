import { useRef } from "react";
import { HStack, Section, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { TextArea } from "@astryxdesign/core/TextArea";
import { SECTION_PADDING, SectionHeader } from "./shared";

export type ActivityEntry = { id: number; kind: "comment" | "event"; who: string; when: string; text: string };

export function ActivitySection({ entries, comment, onCommentChange, onSend }: {
  entries: ActivityEntry[]; comment: string; onCommentChange: (value: string) => void; onSend: () => void;
}) {
  const commentFieldRef = useRef<HTMLTextAreaElement>(null);

  const focusCommentField = () => {
    const field = commentFieldRef.current;
    if (!field) return;
    // Scroll first, then take focus without a second jump competing with it.
    field.scrollIntoView({ behavior: "smooth", block: "center" });
    field.focus({ preventScroll: true });
  };

  return (
    <Section padding={SECTION_PADDING}>
      <VStack gap={10}>
        <SectionHeader title="Activity" action={<Button label="Write to Coding" onClick={focusCommentField} />} />
        <VStack gap={6}>
          {entries.map((entry) => {
            const isComment = entry.kind === "comment";
            return (
              <HStack key={entry.id} gap={3} vAlign="start">
                <Avatar name={entry.who} size="sm" />
                <StackItem size="fill">
                  <VStack gap={1}>
                    <HStack gap={2} vAlign="center" wrap="wrap">
                      <Text type="body" weight="semibold">{entry.who}</Text>
                      {/* An event is one line, so its text sits on the byline instead of getting a bubble of its own. */}
                      {!isComment && <Text type="supporting" color="secondary">{entry.text}</Text>}
                      <StackItem size="fill" />
                      <Text type="supporting" color="secondary">{entry.when}</Text>
                    </HStack>
                    {isComment && <Card variant="muted" padding={3}><Text type="body">{entry.text}</Text></Card>}
                  </VStack>
                </StackItem>
              </HStack>
            );
          })}
        </VStack>
        <VStack gap={2} hAlign="stretch">
          <Text type="supporting" color="secondary">Goes to Coding, not to a thread</Text>
          <TextArea
            ref={commentFieldRef}
            width="100%"
            label="Write to Coding"
            isLabelHidden
            placeholder="Goes to Coding, not to a thread"
            value={comment}
            onChange={onCommentChange}
            rows={5}
          />
          <HStack gap={2} hAlign="end">
            <Button label="Cancel" variant="ghost" onClick={() => onCommentChange("")} />
            <Button label="Send to Coding" variant="primary" isDisabled={comment.trim().length === 0} onClick={onSend} />
          </HStack>
        </VStack>
      </VStack>
    </Section>
  );
}

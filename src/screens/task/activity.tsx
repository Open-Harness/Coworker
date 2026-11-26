// astryx-template: work-item-detail
import { useRef } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, Section, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { SECTION_PADDING, SectionHeader } from "./shared.tsx";

export interface ActivityEntry {
  readonly id: string;
  readonly kind: "comment" | "event";
  readonly who: string;
  readonly when: string;
  readonly text: string;
}

export function ActivitySection(props: {
  readonly entries: readonly ActivityEntry[];
  readonly manager: string;
  readonly comment: string;
  readonly onCommentChange: (value: string) => void;
  readonly onSend: () => void;
}) {
  const { entries, manager, comment, onCommentChange, onSend } = props;
  const field = useRef<HTMLTextAreaElement>(null);
  const focusCommentField = () => {
    const el = field.current;
    if (!el) return;
    // Scroll first, then take focus without a second jump competing with it.
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  };
  return (
    <Section padding={SECTION_PADDING}>
      <VStack gap={10}>
        <SectionHeader title="Activity" action={<Button label={`Write to ${manager}`} onClick={focusCommentField} />} />
        <VStack gap={6}>
          {entries.map((entry) => {
            const isComment = entry.kind === "comment";
            return (
              <HStack key={entry.id} gap={3} vAlign="start">
                <Avatar name={entry.who} size="sm" />
                <StackItem size="fill">
                  <VStack gap={1}>
                    <HStack gap={2} vAlign="center" wrap="wrap">
                      <Text type="body" weight="semibold">
                        {entry.who}
                      </Text>
                      {/* An event is one line, so its text sits on the byline instead of getting a bubble of its own. */}
                      {!isComment && (
                        <Text type="supporting" color="secondary">
                          {entry.text}
                        </Text>
                      )}
                      <StackItem size="fill" />
                      <Text type="supporting" color="secondary">
                        {entry.when}
                      </Text>
                    </HStack>
                    {isComment && (
                      <Card variant="muted" padding={3}>
                        <Text type="body">{entry.text}</Text>
                      </Card>
                    )}
                  </VStack>
                </StackItem>
              </HStack>
            );
          })}
        </VStack>
        <VStack gap={2} hAlign="stretch">
          <Text type="supporting" color="secondary">{`Goes to ${manager}, not to a thread`}</Text>
          <TextArea
            ref={field}
            width="100%"
            label={`Write to ${manager}`}
            isLabelHidden
            placeholder={`Goes to ${manager}, not to a thread`}
            value={comment}
            onChange={onCommentChange}
            rows={5}
          />
          <HStack gap={2} hAlign="end">
            <Button label="Cancel" variant="ghost" onClick={() => onCommentChange("")} />
            <Button label={`Send to ${manager}`} variant="primary" isDisabled={comment.trim().length === 0} onClick={onSend} />
          </HStack>
        </VStack>
      </VStack>
    </Section>
  );
}

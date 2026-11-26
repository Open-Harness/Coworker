import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Heading, Text } from "@astryxdesign/core/Text";
import type { ChoiceData, ItemData, Reply } from "../types.ts";

/** A, B, C… as the canvas letters the options. */
export const letterOf = (index: number): string => String.fromCharCode(65 + index);

interface ChoosingProps {
  readonly item: ItemData;
  readonly onReply: (reply: Reply) => Promise<void>;
}

function OptionCard({
  choice,
  index,
  recommended,
  isOpen,
  onReply,
}: {
  readonly choice: ChoiceData;
  readonly index: number;
  readonly recommended: boolean;
  readonly isOpen: boolean;
  readonly onReply: (reply: Reply) => Promise<void>;
}) {
  return (
    <Card padding={4} height="100%">
      <VStack gap={3} height="100%">
        <StackItem size="fill">
          <VStack gap={3}>
            <VStack gap={2} hAlign="start">
              <Heading level={4} accessibilityLevel={3}>{`${letterOf(index)} · ${choice.label}`}</Heading>
              {recommended && <Badge variant="success" label="Manager recommends" />}
            </VStack>
            {choice.next.length > 0 && (
              <VStack gap={1}>
                <Text type="label">What happens next</Text>
                <List listStyle="disc" density="compact">
                  {choice.next.map((line) => (
                    <ListItem key={line} label={<Text>{line}</Text>} />
                  ))}
                </List>
              </VStack>
            )}
            {choice.risk !== undefined && <Text type="supporting">{`Risk: ${choice.risk}`}</Text>}
            {choice.cost !== undefined && <Text type="supporting">{`Cost: ${choice.cost}`}</Text>}
          </VStack>
        </StackItem>
        <HStack>
          <Button
            label={`Choose ${letterOf(index)}`}
            variant={recommended ? "primary" : "secondary"}
            isDisabled={!isOpen}
            clickAction={() => onReply({ choice: choice.label })}
          />
        </HStack>
      </VStack>
    </Card>
  );
}

function Choices({ item, isOpen, onReply }: ChoosingProps & { readonly isOpen: boolean }) {
  return (
    <HStack gap={2} wrap="wrap">
      {item.choices.map(({ label }, index) => (
        <Button
          key={label}
          label={label}
          variant={index === 0 ? "primary" : "secondary"}
          isDisabled={!isOpen}
          clickAction={() => onReply({ choice: label })}
        />
      ))}
    </HStack>
  );
}

/** The options, the manager's pick first in words, then a box for the person's own answer. */
export function Options({ item, onReply }: ChoosingProps) {
  const [words, setWords] = useState("");
  const isOpen = item.answer === undefined;
  // Nobody reads words in answer to the workspace's own question: it is one choice or the other.
  if (item.managerId === "") return <Choices item={item} isOpen={isOpen} onReply={onReply} />;
  const picked = item.choices.findIndex(({ label }) => label === item.recommend?.option);
  return (
    <VStack gap={4}>
      {item.recommend !== undefined && (
        <Text>{`Why the manager recommends ${picked >= 0 ? letterOf(picked) : item.recommend.option}: ${item.recommend.why}`}</Text>
      )}
      {item.choices.length > 0 && (
        <Grid columns={{ minWidth: 220 }} gap={3} align="stretch">
          {item.choices.map((choice, index) => (
            <OptionCard key={choice.label} choice={choice} index={index} recommended={index === picked} isOpen={isOpen} onReply={onReply} />
          ))}
        </Grid>
      )}
      <VStack gap={2}>
        <TextArea
          label={`${item.choices.length === 0 ? "Answer" : "Or answer"} in your own words. The manager reads it and asks again if it's unclear.`}
          value={words}
          onChange={setWords}
          isDisabled={!isOpen}
          {...(item.choices.length === 0 ? {} : { placeholder: "e.g. A, but say it is for now and link to the plan" })}
        />
        <HStack hAlign="end">
          <StackItem>
            <Button label="Send answer" isDisabled={!isOpen || words.trim() === ""} clickAction={() => onReply({ text: words.trim() })} />
          </StackItem>
        </HStack>
      </VStack>
    </VStack>
  );
}

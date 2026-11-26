// astryx-template: table-inbox
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { List, ListItem } from "@astryxdesign/core/List";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { Token } from "@astryxdesign/core/Token";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon as CloseIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import type { Item, Option } from "./data.ts";
import { MESSAGE_MEASURE } from "./surface.ts";

const Part = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <VStack gap={1} maxWidth={MESSAGE_MEASURE}>
    <Heading level={4} accessibilityLevel={3}>
      {title}
    </Heading>
    {children}
  </VStack>
);

/** Who it waits for, said in the one colour that means "a person": yellow for Ama, grey for anyone else. */
function Standing({ item }: { item: Item }) {
  if (item.standing === "ask") return <Badge variant="warning" label="Waits for you" />;
  if (item.standing === "wait") return <Token size="sm" label={`Waits for ${item.waitsFor ?? "someone"}`} />;
  if (item.standing === "done") return <Token size="sm" label="Done" />;
  return null;
}

/** The answer: the buttons are the manager's options, the first one is what it recommends. Docked, so it stays with what you are reading. */
function Answer({ item, isFullWidth, onAnswer }: { item: Item; isFullWidth: boolean; onAnswer: (option: Option) => void }) {
  const inset = isFullWidth ? 4 : 6;
  if (item.standing === "done") {
    return (
      <VStack paddingInline={inset} paddingBlock={3}>
        <Text color="secondary">You answered: {item.answered}</Text>
      </VStack>
    );
  }
  return (
    <VStack gap={2} paddingInline={inset} paddingBlock={3}>
      <Text type="supporting" color="secondary">
        {item.options.length > 1 ? `${item.from} recommends the first.` : "Nothing else is asked."}
      </Text>
      <HStack gap={2} wrap="wrap">
        {item.options.map((option, index) => (
          <Button
            key={option.id}
            label={option.label}
            variant={index === 0 ? "primary" : "secondary"}
            icon={option.go ? <Icon icon={ArrowRightIcon} size="sm" /> : undefined}
            onClick={() => onAnswer(option)}
          />
        ))}
      </HStack>
    </VStack>
  );
}

/** One item, read in full: what is asked, why now, what it looked at, what happens if nobody answers, and where the work is. */
export function ItemPane({
  item,
  onClose,
  isFullWidth,
  onAnswer,
}: {
  item: Item;
  onClose: () => void;
  isFullWidth: boolean;
  onAnswer: (option: Option) => void;
}) {
  const go = useGo();
  return (
    <VStack height="100%">
      {/* Two headers: beside the list there is width for one line; full width the way out takes the top row and the title drops beneath it. */}
      {isFullWidth ? (
        <>
          <Toolbar
            label="Item"
            startContent={
              <Button
                label="Inbox"
                variant="ghost"
                icon={<Icon icon={ArrowLeftIcon} size="sm" xstyle={rtlStyles.mirror} />}
                onClick={onClose}
              />
            }
          />
          <VStack paddingInline={4} paddingBlockEnd={3}>
            <Heading level={3} accessibilityLevel={2} maxLines={3} hasTruncateTooltip>
              {item.title}
            </Heading>
          </VStack>
        </>
      ) : (
        /* Uneven on purpose: the title has no side bearing, the close button carries its own, so 12 and 8 put both on the content line. */
        <VStack paddingBlockStart={4} paddingInlineStart={3} paddingInlineEnd={2}>
          <Toolbar
            label="Item"
            startContent={
              <Heading level={2} maxLines={2} hasTruncateTooltip>
                {item.title}
              </Heading>
            }
            endContent={
              <IconButton variant="ghost" label="Close" tooltip="Close" icon={<Icon icon={CloseIcon} size="sm" />} onClick={onClose} />
            }
          />
        </VStack>
      )}

      <StackItem size="fill">
        <VStack paddingInline={isFullWidth ? 4 : 6} paddingBlockEnd={4} gap={5} isScrollable height="100%">
          <HStack gap={2} vAlign="center" wrap="wrap">
            <Standing item={item} />
            <Token size="sm" label={item.from} />
            {item.isProposal ? <Token size="sm" color="blue" label="Proposed" /> : null}
            <Text type="supporting" color="secondary">
              {item.at}
            </Text>
          </HStack>
          <Part title="What is asked">
            <Text>{item.asks}</Text>
          </Part>
          <Part title="Why now">
            <Text>{item.why}</Text>
          </Part>
          <Part title="What it looked at">
            <List density="balanced" hasDividers>
              {item.looked.map((line) => (
                <ListItem key={line} label={<>{line}</>} />
              ))}
            </List>
          </Part>
          {item.otherwise === "" || item.standing === "done" ? null : (
            <Part title="If nobody answers">
              <Text>{item.otherwise}</Text>
            </Part>
          )}
          <HStack gap={1} wrap="wrap" vAlign="center">
            {item.links.map((link) => (
              <Button
                key={link.to}
                label={link.label}
                variant="secondary"
                size="sm"
                icon={<Icon icon={ArrowRightIcon} size="sm" />}
                onClick={() => go(link.to)}
              />
            ))}
          </HStack>
        </VStack>
      </StackItem>
      <Answer item={item} isFullWidth={isFullWidth} onAnswer={onAnswer} />
    </VStack>
  );
}

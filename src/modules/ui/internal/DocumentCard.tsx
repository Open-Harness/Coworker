import { ChevronRightIcon, CodeBracketIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { rtlStyles } from "@astryxdesign/core/utils";

interface DocumentCardProps {
  readonly title: string;
  readonly language: string;
  readonly version: number;
  readonly onOpen: () => void;
}

export const documentKind = (language: string): string => (language === "markdown" ? "Document" : `Code · ${language}`);
export const documentIcon = (language: string) => (language === "markdown" ? DocumentTextIcon : CodeBracketIcon);

/** A document the assistant wrote, in the conversation that made it. */
export function DocumentCard({ title, language, version, onOpen }: DocumentCardProps) {
  return (
    <ClickableCard label={`Open ${title}`} onClick={onOpen} variant="muted" padding={3} maxWidth={360}>
      <HStack gap={3} vAlign="center" width="100%">
        <Icon icon={documentIcon(language)} size="md" color="secondary" />
        <StackItem size="fill">
          <VStack gap={0}>
            <Text type="label" weight="semibold" maxLines={1}>
              {title}
            </Text>
            <Text type="supporting" color="secondary">
              {`${documentKind(language)} · v${version}`}
            </Text>
          </VStack>
        </StackItem>
        <Icon icon={ChevronRightIcon} size="sm" color="secondary" xstyle={rtlStyles.mirror} />
      </HStack>
    </ClickableCard>
  );
}

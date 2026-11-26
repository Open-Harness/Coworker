import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Section } from "@astryxdesign/core/Section";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { CheckCircleIcon, EnvelopeOpenIcon } from "@heroicons/react/24/outline";
import { CATEGORIES, type Category } from "./data.ts";
import { SELECTION_BAR_HEIGHT } from "./surface.ts";

/** The toolbar row: search, and how many are unread. The manager's name and the app switch are above this screen already. */
export function ToolbarRow({
  query,
  onQuery,
  unread,
  total,
}: {
  query: string;
  onQuery: (q: string) => void;
  unread: number;
  total: number;
}) {
  return (
    <HStack gap={3} vAlign="center" wrap="wrap" paddingInline={4} paddingBlock={3}>
      <StackItem size="fill">
        <TextInput
          label="Search conversations"
          isLabelHidden
          startIcon="search"
          placeholder="Search by name, subject or words"
          value={query}
          onChange={onQuery}
          hasClear
          width="100%"
        />
      </StackItem>
      <Text type="supporting" color="secondary">
        {unread} unread of {total}
      </Text>
    </HStack>
  );
}

/** Places rather than filters: a conversation stands in one at a time, so the count on a tab is exactly what the tab shows. */
export function Tabs({ value, onChange, counts }: { value: Category; onChange: (c: Category) => void; counts: Record<Category, number> }) {
  return (
    // The 4px inset puts the first label on the 16px content line: a Tab carries 12px of its own padding.
    <VStack paddingInline={1}>
      <TabList hasDivider value={value} onChange={(v) => onChange(v as Category)}>
        {CATEGORIES.map((option) => (
          <Tab
            key={option.value}
            value={option.value}
            label={option.label}
            endContent={
              counts[option.value] === 0 ? undefined : (
                <Badge
                  variant="neutral"
                  label={
                    <>
                      {counts[option.value]}
                      <VisuallyHidden> conversations</VisuallyHidden>
                    </>
                  }
                />
              )
            }
          />
        ))}
      </TabList>
    </VStack>
  );
}

/** Takes the tab strip's place, at the same height, so ticking a row does not move the table. */
export function BulkBand({
  count,
  onRead,
  onDone,
  onClear,
}: {
  count: number;
  onRead: () => void;
  onDone: () => void;
  onClear: () => void;
}) {
  return (
    <VStack height={SELECTION_BAR_HEIGHT} vAlign="end" paddingBlockEnd={0.5}>
      <Section variant="muted" paddingInline={3} paddingBlock={2}>
        <HStack gap={3} vAlign="center" minHeight={28}>
          <StackItem size="fill">
            <HStack gap={1} vAlign="center">
              <Button label="Mark as read" variant="ghost" size="sm" icon={<Icon icon={EnvelopeOpenIcon} size="sm" />} onClick={onRead} />
              <Button label="Mark as done" variant="ghost" size="sm" icon={<Icon icon={CheckCircleIcon} size="sm" />} onClick={onDone} />
            </HStack>
          </StackItem>
          <HStack gap={3} vAlign="center">
            <Text type="body">
              {count} {count === 1 ? "conversation" : "conversations"} selected
            </Text>
            <Text type="supporting" color="secondary">
              •
            </Text>
            <Button label="Unselect all" variant="ghost" size="sm" onClick={onClear} />
          </HStack>
        </HStack>
      </Section>
    </VStack>
  );
}

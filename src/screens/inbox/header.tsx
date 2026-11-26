// astryx-template: table-inbox
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { ArrowPathIcon as RefreshIcon, PencilSquareIcon as ComposeIcon } from "@heroicons/react/24/outline";
import { TABS, type Standing } from "./data.ts";

/** The title, one line of status, and the two things that are always true: look again, and ask Juno. */
export function TitleRow({ status, onRefresh, onAsk }: { status: string; onRefresh: () => void; onAsk: () => void }) {
  return (
    <HStack gap={3} vAlign="center" wrap="wrap" padding={4}>
      <StackItem size="fill">
        <VStack gap={0.5}>
          <Heading level={1}>Inbox</Heading>
          <Text type="supporting">{status}</Text>
        </VStack>
      </StackItem>
      <Button label="Refresh" variant="ghost" icon={<Icon icon={RefreshIcon} size="sm" />} onClick={onRefresh} />
      <Button label="Ask Juno" variant="primary" icon={<Icon icon={ComposeIcon} size="sm" />} onClick={onAsk} />
    </HStack>
  );
}

/** Places rather than filters: an item stands in one at a time, so the count on a tab is exactly what the tab shows. Done has no count. */
export function Tabs({
  value,
  onChange,
  counts,
  isShort,
}: {
  value: Standing;
  onChange: (s: Standing) => void;
  counts: Record<Standing, number>;
  isShort: boolean;
}) {
  return (
    // The 4px inset puts the first label on the 16px content line: a Tab carries 12px of its own padding.
    <VStack paddingInline={1}>
      <TabList hasDivider value={value} onChange={(v) => onChange(v as Standing)}>
        {TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={isShort ? tab.short : tab.label}
            endContent={
              tab.value === "done" || counts[tab.value] === 0 ? undefined : (
                <Badge
                  variant={tab.value === "ask" ? "warning" : "neutral"}
                  label={
                    <>
                      {counts[tab.value]}
                      <VisuallyHidden> items</VisuallyHidden>
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

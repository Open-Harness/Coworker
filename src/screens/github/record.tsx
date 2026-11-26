import { useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { ArrowLeftIcon, ArrowRightIcon, XMarkIcon as CloseIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import { Box, Yours } from "./box.tsx";
import type { Item, Opened } from "./data.ts";
import { Checks, Files } from "./files.tsx";
import { Timeline } from "./timeline.tsx";

const STATE_COLOR = { Open: "gray", Merged: "gray", Closed: "gray" } as const;
type Tabname = "talk" | "checks" | "files";

/** The work it became, and how it got here. */
function Links({ item, manager, thread }: { item: Item; manager: string; thread: string | null }) {
  const go = useGo();
  if (!item.work) return null;
  const work = item.work;
  return (
    <HStack gap={1} vAlign="center" wrap="wrap">
      <Button
        label={work}
        variant="secondary"
        size="sm"
        icon={<Icon icon={ArrowRightIcon} size="sm" />}
        onClick={() => go(`/m/${manager}/work/${work}`)}
      />
      {thread !== null ? (
        <Button label="How it got here" variant="ghost" size="sm" onClick={() => go(`/m/${manager}/threads/${thread}`)} />
      ) : null}
    </HStack>
  );
}

/** One issue or pull request, opened: the header, then what GitHub shows for it, and the box. A pull request has three tabs. */
export function Record({
  item,
  opened,
  manager,
  managerName,
  who,
  thread,
  isYours,
  isFullWidth,
  onClose,
  onTell,
  onWrite,
  onHandBack,
}: {
  item: Item;
  opened: Opened | null;
  manager: string;
  managerName: string;
  who: string;
  thread: string | null;
  isYours: boolean;
  isFullWidth: boolean;
  onClose: () => void;
  onTell: (t: string) => void;
  onWrite: (t: string) => void;
  onHandBack: () => void;
}) {
  const [tab, setTab] = useState<Tabname>("talk");
  const hasTabs = item.kind === "pr" && opened !== null && (opened.checks.length > 0 || opened.files.length > 0);
  const shownTab = hasTabs ? tab : "talk";
  const threads = opened?.threads ?? [];
  return (
    <VStack height="100%">
      <VStack gap={2} paddingInline={4} paddingBlockStart={4} paddingBlockEnd={2}>
        <HStack gap={2} vAlign="start">
          {isFullWidth ? (
            <IconButton
              label="Back to the list"
              tooltip="Back to the list"
              icon={<Icon icon={ArrowLeftIcon} size="sm" />}
              variant="ghost"
              size="sm"
              onClick={onClose}
            />
          ) : null}
          <StackItem size="fill">
            <Heading level={2} maxLines={2} hasTruncateTooltip>
              {item.title}{" "}
              <Text type="supporting" color="secondary" as="span">
                #{item.id}
              </Text>
            </Heading>
          </StackItem>
          {isFullWidth ? null : (
            <IconButton
              label="Close"
              tooltip="Close"
              icon={<Icon icon={CloseIcon} size="sm" />}
              variant="ghost"
              size="sm"
              onClick={onClose}
            />
          )}
        </HStack>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Token
            size="sm"
            color={STATE_COLOR[item.state]}
            label={`${item.kind === "pr" ? "Pull request" : "Issue"}, ${item.state.toLowerCase()}`}
          />
          <Text type="supporting" color="secondary">
            {item.author} opened it {item.opened}
          </Text>
          {item.related ? (
            <Text type="supporting" color="secondary">
              {item.related}
            </Text>
          ) : null}
          {item.labels.map((l) => (
            <Token key={l} size="sm" label={l} />
          ))}
        </HStack>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Links item={item} manager={manager} thread={thread} />
          {isYours ? <Yours onBack={onHandBack} /> : null}
        </HStack>
      </VStack>
      {hasTabs && opened !== null ? (
        <VStack paddingInline={1}>
          <TabList hasDivider value={tab} onChange={(v) => setTab(v as Tabname)}>
            <Tab value="talk" label="Conversation" />
            <Tab value="checks" label="Checks" endContent={<Badge label={String(opened.checks.length)} variant="neutral" />} />
            <Tab value="files" label="Files changed" endContent={<Badge label={String(opened.files.length)} variant="neutral" />} />
          </TabList>
        </VStack>
      ) : null}
      <StackItem size="fill">
        <VStack paddingInline={4} paddingBlock={4} isScrollable height="100%">
          {shownTab === "talk" ? (
            <Timeline entries={opened?.entries ?? []} threads={threads} who={who} managerName={managerName} />
          ) : shownTab === "checks" ? (
            <Checks checks={opened?.checks ?? []} />
          ) : (
            <Files files={opened?.files ?? []} threads={threads} />
          )}
        </VStack>
      </StackItem>
      <Box key={item.id} who={who} managerName={managerName} onTell={onTell} onWrite={onWrite} />
    </VStack>
  );
}

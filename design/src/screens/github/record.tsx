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
import { go } from "../../shell";
import { Box, Yours } from "./box";
import type { Entry, Item } from "./data";
import { Checks, Files } from "./files";
import { CHECKS_418, FILES_418, THREADS_418 } from "./pr418";
import { Timeline } from "./timeline";

const STATE_COLOR = { Open: "gray", Merged: "gray", Closed: "gray" } as const;
type Tabname = "talk" | "checks" | "files";

/** The work it became, and how it got here: only the story's ACME-412 has a page and a thread. */
function Links({ item }: { item: Item }) {
  if (!item.work) return null;
  const known = item.work === "ACME-412";
  return (
    <HStack gap={1} vAlign="center" wrap="wrap">
      <Button label={item.work} variant="secondary" size="sm" icon={<Icon icon={ArrowRightIcon} size="sm" />} onClick={() => go(known ? "task" : "m-coding-board")} />
      {known ? <Button label="How it got here" variant="ghost" size="sm" onClick={() => go("thread")} /> : null}
    </HStack>
  );
}

/** One issue or pull request, opened: the header, then what GitHub shows for it, and the box. A pull request has three tabs. */
export function Record({ item, entries, isYours, isFullWidth, onClose, onTell, onWrite, onHandBack }: {
  item: Item; entries: readonly Entry[]; isYours: boolean; isFullWidth: boolean; onClose: () => void;
  onTell: (t: string) => void; onWrite: (t: string) => void; onHandBack: () => void;
}) {
  const [tab, setTab] = useState<Tabname>("talk");
  const is418 = item.id === "418";
  const shownTab = item.kind === "pr" && is418 ? tab : "talk";
  const threads = is418 ? THREADS_418 : [];
  return (
    <VStack height="100%">
      <VStack gap={2} paddingInline={4} paddingBlockStart={4} paddingBlockEnd={2}>
        <HStack gap={2} vAlign="start">
          {isFullWidth ? <IconButton label="Back to the list" tooltip="Back to the list" icon={<Icon icon={ArrowLeftIcon} size="sm" />} variant="ghost" size="sm" onClick={onClose} /> : null}
          <StackItem size="fill"><Heading level={2} maxLines={2} hasTruncateTooltip>{item.title} <Text type="supporting" color="secondary" as="span">#{item.id}</Text></Heading></StackItem>
          {isFullWidth ? null : <IconButton label="Close" tooltip="Close" icon={<Icon icon={CloseIcon} size="sm" />} variant="ghost" size="sm" onClick={onClose} />}
        </HStack>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Token size="sm" color={STATE_COLOR[item.state]} label={`${item.kind === "pr" ? "Pull request" : "Issue"}, ${item.state.toLowerCase()}`} />
          <Text type="supporting" color="secondary">{item.author} opened it {item.opened}</Text>
          {item.related ? <Text type="supporting" color="secondary">{item.related}</Text> : null}
          {item.labels.map((l) => <Token key={l} size="sm" label={l} />)}
        </HStack>
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Links item={item} />
          {isYours ? <Yours onBack={onHandBack} /> : null}
        </HStack>
      </VStack>
      {item.kind === "pr" && is418 ? (
        <VStack paddingInline={1}>
          <TabList hasDivider value={tab} onChange={(v) => setTab(v as Tabname)}>
            <Tab value="talk" label="Conversation" />
            <Tab value="checks" label="Checks" endContent={<Badge label={String(CHECKS_418.length)} variant="neutral" />} />
            <Tab value="files" label="Files changed" endContent={<Badge label={String(FILES_418.length)} variant="neutral" />} />
          </TabList>
        </VStack>
      ) : null}
      <StackItem size="fill">
        <VStack paddingInline={4} paddingBlock={4} isScrollable height="100%">
          {shownTab === "talk" ? <Timeline entries={entries} threads={threads} /> : shownTab === "checks" ? <Checks checks={CHECKS_418} /> : <Files files={FILES_418} threads={threads} />}
        </VStack>
      </StackItem>
      <Box key={item.id} onTell={onTell} onWrite={onWrite} />
    </VStack>
  );
}

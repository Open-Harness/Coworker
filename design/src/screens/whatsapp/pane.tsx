import type { ReactNode } from "react";
import { ChatLayout } from "@astryxdesign/core/Chat";
import { Drawer } from "@astryxdesign/core/Drawer";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { ArrowLeftIcon, InboxIcon } from "@heroicons/react/24/outline";

export interface PaneProps {
  list: ReactNode;
  /** A conversation is open. On a phone this is what switches from the list to the conversation. */
  isOpen: boolean;
  onBack: () => void;
  lead: ReactNode;
  title: string;
  subtitle: ReactNode;
  actions?: ReactNode;
  composer: ReactNode;
  stream: ReactNode;
  /** The thread beside the stream. Without one the panel is absent. */
  thread?: ReactNode;
  isThreadOpen?: boolean;
  onThreadOpenChange?: (isOpen: boolean) => void;
}

/** The list on the start side, the conversation next to it, and the thread panel on the end side. */
export function Pane(p: PaneProps) {
  const isNarrow = useMediaQuery("(max-width: 1280px)");
  const isPhone = useMediaQuery("(max-width: 767px)");
  const hasThread = Boolean(p.thread) && (p.isThreadOpen ?? false) && (!isPhone || p.isOpen);

  const conversation = (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider padding={3}>
          <HStack gap={3} vAlign="center">
            {isPhone ? <IconButton label="Back to the list" tooltip="Back to the list" icon={<Icon icon={ArrowLeftIcon} size="sm" color="inherit" />} variant="ghost" size="sm" onClick={p.onBack} /> : null}
            {p.lead}
            <StackItem size="fill">
              <VStack gap={0}>
                <Heading level={3}>{p.title}</Heading>
                <Text type="supporting" color="secondary" maxLines={1}>{p.subtitle}</Text>
              </VStack>
            </StackItem>
            {p.actions}
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={0} isScrollable={false}>
          <VStack height="100%">
            <ChatLayout
              composer={p.composer}
              emptyState={<EmptyState icon={<Icon icon={InboxIcon} size="lg" />} title="Nothing here yet" description="What comes in and goes out shows up here." />}
            >
              {p.stream}
            </ChatLayout>
          </VStack>
        </LayoutContent>
      }
      end={hasThread && !isNarrow ? <LayoutPanel width={340} padding={0} hasDivider>{p.thread}</LayoutPanel> : undefined}
    />
  );

  const drawer = (
    <Drawer label="Thread" isOpen={isNarrow && hasThread} onOpenChange={(o) => p.onThreadOpenChange?.(o)} width={360} padding={0}>
      {isNarrow ? p.thread : null}
    </Drawer>
  );

  if (isPhone) {
    return (
      <>
        {p.isOpen ? conversation : <Layout height="fill" content={<LayoutContent padding={0}>{p.list}</LayoutContent>} />}
        {drawer}
      </>
    );
  }
  return (
    <>
      <Layout
        height="fill"
        start={<LayoutPanel width={300} padding={0} hasDivider isScrollable={false}>{p.list}</LayoutPanel>}
        content={<LayoutContent padding={0} isScrollable={false}>{conversation}</LayoutContent>}
      />
      {drawer}
    </>
  );
}

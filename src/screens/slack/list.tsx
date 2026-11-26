import { Badge } from "@astryxdesign/core/Badge";
import { Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  ChatBubbleLeftEllipsisIcon,
  HashtagIcon as ChannelIcon,
  MagnifyingGlassIcon as SearchIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import type { Fork, SlackThread, SlackView } from "~/modules/views-connector/types.ts";

type Channel = SlackView["channels"][number];

const mark = (t: SlackThread) =>
  t.waits.length > 0 ? <StatusDot variant="warning" label={`Waits for ${t.waits.join(" or ")}`} /> : undefined;

function ForkRow({ f }: { f: Fork }) {
  const go = useGo();
  const below = f.forks;
  return (
    <SideNavItem
      label={f.name}
      icon={ChatBubbleLeftEllipsisIcon}
      {...(f.link === null ? {} : { onClick: () => go(f.link ?? "") })}
      {...(below.length > 0 ? { collapsible: { defaultIsCollapsed: false } } : {})}
    >
      {below.length > 0 ? (
        <VStack gap={0.5}>
          {below.map((b) => (
            <ForkRow key={b.name} f={b} />
          ))}
        </VStack>
      ) : undefined}
    </SideNavItem>
  );
}

function ThreadRow({ t, selected, onOpen }: { t: SlackThread; selected: string | null; onOpen: (t: SlackThread) => void }) {
  const kids = t.forks;
  return (
    <SideNavItem
      label={t.name}
      icon={ChatBubbleLeftEllipsisIcon}
      isSelected={selected === t.id}
      onClick={() => onOpen(t)}
      {...(mark(t) ? { endContent: mark(t) } : {})}
      {...(kids.length > 0 ? { collapsible: { defaultIsCollapsed: false } } : {})}
    >
      {kids.length > 0 ? (
        <VStack gap={0.5}>
          {kids.map((k) => (
            <ForkRow key={k.name} f={k} />
          ))}
        </VStack>
      ) : undefined}
    </SideNavItem>
  );
}

function ConversationRow({
  cv,
  threads,
  selectedConv,
  selectedThread,
  unread,
  onOpen,
  onThread,
}: {
  cv: Channel;
  threads: readonly SlackThread[];
  selectedConv: string;
  selectedThread: string | null;
  unread: number;
  onOpen: () => void;
  onThread: (t: SlackThread) => void;
}) {
  const nested = threads.length > (cv.kind === "channel" ? 0 : 1);
  return (
    <SideNavItem
      label={cv.name}
      icon={cv.kind === "channel" ? ChannelIcon : UserIcon}
      isSelected={selectedConv === cv.id && selectedThread === null}
      onClick={onOpen}
      {...(unread > 0 ? { endContent: <Badge label={String(unread)} variant="neutral" /> } : {})}
      {...(nested ? { collapsible: { defaultIsCollapsed: false } } : {})}
    >
      {nested ? (
        <VStack gap={0.5}>
          {threads.map((t) => (
            <ThreadRow key={t.id} t={t} selected={selectedThread} onOpen={onThread} />
          ))}
        </VStack>
      ) : undefined}
    </SideNavItem>
  );
}

/** Channels, then direct messages. Under a conversation, its threads; under a thread, the threads it started. */
export function SlackList({
  channels,
  q,
  onQ,
  selectedConv,
  selectedThread,
  unread,
  onOpen,
  onThread,
}: {
  channels: SlackView["channels"];
  q: string;
  onQ: (q: string) => void;
  selectedConv: string;
  selectedThread: string | null;
  unread: Readonly<Record<string, number>>;
  onOpen: (id: string) => void;
  onThread: (t: SlackThread, channel: string) => void;
}) {
  const query = q.trim().toLowerCase();
  const rows = (kind: Channel["kind"]) =>
    channels
      .filter((cv) => cv.kind === kind)
      .map((cv) => ({ cv, threads: cv.threads }))
      .filter(({ cv, threads }) => cv.name.toLowerCase().includes(query) || threads.some((t) => t.name.toLowerCase().includes(query)));
  const part = (title: string, kind: Channel["kind"]) => (
    <SideNavSection title={title}>
      {rows(kind).map(({ cv, threads }) => (
        <ConversationRow
          key={cv.id}
          cv={cv}
          threads={threads}
          selectedConv={selectedConv}
          selectedThread={selectedThread}
          unread={unread[cv.id] ?? 0}
          onOpen={() => onOpen(cv.id)}
          onThread={(t) => onThread(t, cv.id)}
        />
      ))}
    </SideNavSection>
  );
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader padding={2}>
          <TextInput label="Jump to" isLabelHidden placeholder="Jump to..." value={q} onChange={onQ} startIcon={SearchIcon} hasClear />
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={1}>
          {part("Channels", "channel")}
          {part("Direct messages", "direct")}
        </LayoutContent>
      }
    />
  );
}

import { Badge } from "@astryxdesign/core/Badge";
import { Layout, LayoutContent, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ChatBubbleLeftEllipsisIcon, HashtagIcon as ChannelIcon, MagnifyingGlassIcon as SearchIcon, UserIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import { CONVERSATIONS, THREADS, type Conversation, type Fork, type Thread } from "./data";

const mark = (t: Thread) => (t.waits ? <StatusDot variant="warning" label={t.id === "t-rate" ? "Waits for Chidi" : "Waits for Bo or Chidi"} /> : undefined);

function ForkRow({ f }: { f: Fork }) {
  const below = f.sub ?? [];
  return (
    <SideNavItem label={f.name} icon={ChatBubbleLeftEllipsisIcon} onClick={() => go(f.to ?? "soon-Thread")} {...(below.length > 0 ? { collapsible: { defaultIsCollapsed: false } } : {})}>
      {below.length > 0 ? <VStack gap={0.5}>{below.map((b) => <ForkRow key={b.name} f={b} />)}</VStack> : undefined}
    </SideNavItem>
  );
}

function ThreadRow({ t, selected, onOpen }: { t: Thread; selected: string | null; onOpen: (t: Thread) => void }) {
  const kids = t.sub ?? [];
  return (
    <SideNavItem label={t.name} icon={ChatBubbleLeftEllipsisIcon} isSelected={selected === t.id} onClick={() => onOpen(t)} {...(mark(t) ? { endContent: mark(t) } : {})} {...(kids.length > 0 ? { collapsible: { defaultIsCollapsed: false } } : {})}>
      {kids.length > 0 ? <VStack gap={0.5}>{kids.map((k) => <ForkRow key={k.name} f={k} />)}</VStack> : undefined}
    </SideNavItem>
  );
}

function ConversationRow({ cv, threads, selectedConv, selectedThread, unread, onOpen, onThread }: {
  cv: Conversation; threads: readonly Thread[]; selectedConv: string; selectedThread: string | null; unread: number; onOpen: () => void; onThread: (t: Thread) => void;
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
      {nested ? <VStack gap={0.5}>{threads.map((t) => <ThreadRow key={t.id} t={t} selected={selectedThread} onOpen={onThread} />)}</VStack> : undefined}
    </SideNavItem>
  );
}

/** Channels, then direct messages. Under a conversation, its threads; under a thread, the threads it started. */
export function SlackList({ q, onQ, selectedConv, selectedThread, unread, onOpen, onThread }: {
  q: string; onQ: (q: string) => void; selectedConv: string; selectedThread: string | null; unread: Readonly<Record<string, number>>;
  onOpen: (id: string) => void; onThread: (t: Thread) => void;
}) {
  const query = q.trim().toLowerCase();
  const rows = (kind: Conversation["kind"]) => CONVERSATIONS.filter((cv) => cv.kind === kind).map((cv) => ({ cv, threads: THREADS.filter((t) => t.conv === cv.id) }))
    .filter(({ cv, threads }) => cv.name.toLowerCase().includes(query) || threads.some((t) => t.name.toLowerCase().includes(query)));
  const part = (title: string, kind: Conversation["kind"]) => (
    <SideNavSection title={title}>
      {rows(kind).map(({ cv, threads }) => (
        <ConversationRow key={cv.id} cv={cv} threads={threads} selectedConv={selectedConv} selectedThread={selectedThread} unread={unread[cv.id] ?? 0} onOpen={() => onOpen(cv.id)} onThread={onThread} />
      ))}
    </SideNavSection>
  );
  return (
    <Layout
      height="fill"
      header={<LayoutHeader padding={2}><TextInput label="Jump to" isLabelHidden placeholder="Jump to..." value={q} onChange={onQ} startIcon={SearchIcon} hasClear /></LayoutHeader>}
      content={<LayoutContent padding={1}>{part("Channels", "channel")}{part("Direct messages", "dm")}</LayoutContent>}
    />
  );
}

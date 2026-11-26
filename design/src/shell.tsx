// astryx-template: shell-side-nav
import { useState, type ReactNode } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Badge } from "@astryxdesign/core/Badge";
import { Divider } from "@astryxdesign/core/Divider";
import { Layout, LayoutContent, LayoutHeader } from "@astryxdesign/core/Layout";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { StatusDot, type StatusDotVariant } from "@astryxdesign/core/StatusDot";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Kbd } from "@astryxdesign/core/Kbd";
import { useHotkeys } from "@astryxdesign/core/hooks";
import { CodeBracketIcon, Cog6ToothIcon, HomeIcon, IdentificationIcon, InboxIcon, LifebuoyIcon, MagnifyingGlassIcon, MegaphoneIcon, PencilSquareIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { Palette } from "./juno/palette";
import { JUNO, MINE, type Chat } from "./juno/world";
import { manager, under, type Manager, type State } from "./world";

export const go = (to: string) => { location.hash = to; };
export const DOT: Readonly<Record<State, { variant: StatusDotVariant; label: string }>> = {
  working: { variant: "success", label: "Working" }, "needs-you": { variant: "warning", label: "Waits for you" },
  stuck: { variant: "error", label: "Stuck" }, idle: { variant: "neutral", label: "Idle" }, paused: { variant: "neutral", label: "Paused" },
};
const ICON = { coding: CodeBracketIcon, support: LifebuoyIcon, sales: MegaphoneIcon } as const;

/** A manager, and under it the managers it looks after, as deep as the tree goes. Names are whatever people gave them. */
function ManagerItem({ m, at }: { m: Manager; at: string }) {
  const below = under(m.id);
  // Only what is wrong or waiting gets a mark, so a quiet tree is quiet.
  const isLoud = m.state === "stuck" || m.state === "needs-you";
  const dot = !isLoud ? undefined : <StatusDot variant={DOT[m.state].variant} label={DOT[m.state].label} />;
  const href = `#m-${m.id}-overview`;
  return (
    <SideNavItem label={m.name} icon={ICON[m.id as keyof typeof ICON]} href={href} isSelected={at === m.id} {...(dot ? { endContent: dot } : {})} {...(below.length > 0 ? { collapsible: { defaultIsCollapsed: false } } : {})}>
      {below.length > 0 ? <VStack gap={0.5}>{below.map((b) => <ManagerItem key={b.id} m={b} at={at} />)}</VStack> : undefined}
    </SideNavItem>
  );
}

/** A chat with Juno, and under it the chats forked from it. */
function ChatItem({ c, at }: { c: Chat; at: string }) {
  const dot = c.state === "waiting" ? <StatusDot variant="warning" label={`Waits for ${c.for}`} /> : undefined;
  return (
    <SideNavItem label={c.title} href={`#${c.id}`} isSelected={at === c.id} {...(dot ? { endContent: dot } : {})} {...(c.forks ? { collapsible: { defaultIsCollapsed: !at.startsWith(c.id) } } : {})}>
      {c.forks ? <VStack gap={0.5}>{c.forks.map((f) => <ChatItem key={f.title} c={f} at={at} />)}</VStack> : undefined}
    </SideNavItem>
  );
}

/** The frame around every screen: the co-worker first, how it splits the work below it. `extra`: managers it just made. */
export function Shell({ at, place, extra, children }: { at: string; place?: string; extra?: ReactNode; children: ReactNode }) {
  const [isOpen, setOpen] = useState(location.hash === "#palette");
  useHotkeys([{ keys: "mod+k", allowInInputs: true, onPress: () => setOpen(true) }]);
  return (
    <AppShell
      contentPadding={0}
      sideNav={
        <SideNav
          collapsible
          resizable={{ defaultWidth: 248, minWidth: 220, maxWidth: 420 }}
          header={<SideNavHeading heading={JUNO.name} subheading={JUNO.role} icon={<Avatar name={JUNO.name} size={32} tooltip={false} />} headingHref="#home" />}
          footer={
            <SideNavSection title="Account" isHeaderHidden>
              <SideNavItem label="About Juno" icon={IdentificationIcon} href="#juno-about" isSelected={at === "juno"} />
              <SideNavItem label="Settings" icon={Cog6ToothIcon} href="#set-general" isSelected={at === "Settings"} />
              <SideNavItem label="Ama Mensah" icon={UserCircleIcon} href="#set-profile" />
            </SideNavSection>
          }
        >
          <SideNavSection title="Menu" isHeaderHidden>
            <SideNavItem label="New chat" icon={PencilSquareIcon} href="#home" isSelected={at === "home"} />
            <SideNavItem label="Ask, go, do or find" icon={MagnifyingGlassIcon} onClick={() => setOpen(true)} endContent={<Kbd keys="mod+K" />} />
            <SideNavItem label="Inbox" icon={InboxIcon} href="#inbox" isSelected={at === "Inbox"} endContent={<Badge label="3" variant="warning" />} />
          </SideNavSection>
          <Divider />
          <SideNavSection title="Chats">
            {MINE.map((c) => <ChatItem key={c.title} c={c} at={at} />)}
            <SideNavItem label="All chats" href="#chats" isSelected={at === "chats"} />
          </SideNavSection>
          <Divider />
          <SideNavSection title="Managers">
            <SideNavItem label="Overview" icon={HomeIcon} href="#system" isSelected={at === "system"} />
            {under("root").filter((m) => at !== "setup" || m.id !== "sales").map((m) => <ManagerItem key={m.id} m={m} at={at} />)}
            {extra}
          </SideNavSection>
        </SideNav>
      }
    >
      {children}
      <Palette isOpen={isOpen} onOpenChange={setOpen} place={place ?? "this page"} onGo={go} />
    </AppShell>
  );
}

export const TABS = ["Overview", "Intake", "Board", "Playbook", "Connectors", "Threads", "Settings"] as const;
export type TabName = (typeof TABS)[number];
const slug = (t: string) => t.toLowerCase().replaceAll(" ", "-");

/** A manager's header, the same on each of its pages: name, one line of status, tabs. The page fills what is left. */
export function ManagerFrame({ id, tab, children }: { id: string; tab: TabName; children: ReactNode }) {
  const m = manager(id);
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider={false} paddingBlockEnd={0}>
          <VStack gap={2}>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Heading level={1}>{m.name}</Heading>
              <HStack gap={1.5} vAlign="center"><StatusDot variant={DOT[m.state].variant} label={DOT[m.state].label} /><Text type="supporting" color="secondary">{m.now}</Text></HStack>
            </HStack>
            <TabList value={tab} onChange={(t) => go(`m-${id}-${slug(t)}`)} hasDivider isFullBleed>
              {TABS.map((t) => <Tab key={t} value={t} label={t} />)}
            </TabList>
          </VStack>
        </LayoutHeader>
      }
      content={<LayoutContent padding={0} isScrollable={false}>{children}</LayoutContent>}
    />
  );
}

// astryx-template: shell-side-nav
import { CodeBracketIcon, LifebuoyIcon, MegaphoneIcon } from "@heroicons/react/24/outline";
import { SideNavItem } from "@astryxdesign/core/SideNav";
import { VStack } from "@astryxdesign/core/Stack";
import { StatusDot, type StatusDotVariant } from "@astryxdesign/core/StatusDot";
import type { Chat } from "~/modules/coworker/types.ts";
import type { ShellView } from "~/modules/views-workspace/types.ts";

type Node = ShellView["tree"][number];
type State = Node["is"];

export const DOT: Readonly<Record<State, { readonly variant: StatusDotVariant; readonly label: string }>> = {
  working: { variant: "success", label: "Working" },
  "needs you": { variant: "warning", label: "Waits for you" },
  stuck: { variant: "error", label: "Stuck" },
  idle: { variant: "neutral", label: "Idle" },
  paused: { variant: "neutral", label: "Paused" },
};
const ICON = { "code-bracket": CodeBracketIcon, lifebuoy: LifebuoyIcon, megaphone: MegaphoneIcon } as const;
const isIcon = (name: string): name is keyof typeof ICON => name in ICON;

/** The id of the manager a path is in: `/m/coding/board` is `coding`. */
export const managerAt = (path: string): string | undefined => /^\/m\/([^/]+)/u.exec(path)?.[1];

interface ManagerProps {
  readonly node: Node;
  readonly tree: ShellView["tree"];
  readonly at: string | undefined;
  readonly href: (to: string) => string;
}

/** A manager, and under it the managers it looks after, as deep as the tree goes. Names are whatever people gave them. */
export function ManagerItem({ node, tree, at, href }: ManagerProps) {
  const below = tree.filter((other) => other.above === node.id);
  // Only what is wrong or waiting gets a mark, so a quiet tree is quiet.
  const isLoud = node.is === "stuck" || node.is === "needs you";
  const icon = isIcon(node.icon) ? ICON[node.icon] : undefined;
  return (
    <SideNavItem
      label={node.name}
      href={href(`/m/${node.id}`)}
      isSelected={at === node.id}
      {...(icon === undefined ? {} : { icon })}
      {...(isLoud ? { endContent: <StatusDot variant={DOT[node.is].variant} label={DOT[node.is].label} /> } : {})}
      {...(below.length > 0 ? { collapsible: { defaultIsCollapsed: false } } : {})}
    >
      {below.length > 0 ? (
        <VStack gap={0.5}>
          {below.map((one) => (
            <ManagerItem key={one.id} node={one} tree={tree} at={at} href={href} />
          ))}
        </VStack>
      ) : undefined}
    </SideNavItem>
  );
}

interface ChatProps {
  readonly chat: Chat;
  readonly all: readonly Chat[];
  readonly at: string | undefined;
  readonly href: (to: string) => string;
}

const isWithin = (chat: Chat, all: readonly Chat[], at: string | undefined): boolean =>
  chat.id === at || all.some((other) => other.under === chat.id && isWithin(other, all, at));

/** A chat with the co-worker, and under it the chats forked from it. */
export function ChatItem({ chat, all, at, href }: ChatProps) {
  const forks = all.filter((other) => other.under === chat.id);
  const dot = chat.state === "waits" ? <StatusDot variant="warning" label={`Waits for ${chat.waitsFor ?? "someone"}`} /> : undefined;
  return (
    <SideNavItem
      label={chat.title}
      href={href(`/chats/${chat.id}`)}
      isSelected={at === chat.id}
      {...(dot === undefined ? {} : { endContent: dot })}
      {...(forks.length > 0 ? { collapsible: { defaultIsCollapsed: !isWithin(chat, all, at) } } : {})}
    >
      {forks.length > 0 ? (
        <VStack gap={0.5}>
          {forks.map((fork) => (
            <ChatItem key={fork.id} chat={fork} all={all} at={at} href={href} />
          ))}
        </VStack>
      ) : undefined}
    </SideNavItem>
  );
}

// astryx-template: shell-side-nav
import { useEffect, useState, type ReactNode } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Divider } from "@astryxdesign/core/Divider";
import { useHotkeys } from "@astryxdesign/core/hooks";
import { Kbd } from "@astryxdesign/core/Kbd";
import { VStack } from "@astryxdesign/core/Layout";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import {
  Cog6ToothIcon,
  HomeIcon,
  IdentificationIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Dock } from "~/juno/dock.tsx";
import { Palette } from "~/juno/palette.tsx";
import { ShowProvider, useShow } from "~/juno/walk/show.tsx";
import { ChatItem, ManagerItem, managerAt } from "~/juno/nav.tsx";
import { Reading, Waiting, useGo, useHref, useRead } from "~/modules/page/service.ts";
import type { Here } from "~/modules/page/types.ts";
import type { ShellView } from "~/modules/views-workspace/types.ts";

/** What the palette says of the page it is opened on: the route's own word, or the manager the page is in. */
const placeOf = (here: Here, shell: ShellView): string =>
  here.route?.place ?? shell.tree.find((node) => node.id === managerAt(here.path))?.name ?? "this page";

function Frame({ shell, here, children }: { readonly shell: ShellView; readonly here: Here; readonly children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const href = useHref();
  const go = useGo();
  const show = useShow();
  useHotkeys([{ keys: "mod+k", allowInInputs: true, onPress: () => setOpen(true) }]);
  const { path } = here;
  const manager = managerAt(path);
  const chat = /^\/chats\/([^/]+)/u.exec(path)?.[1];
  const { coworker, tree, chats } = shell;
  return (
    <AppShell
      contentPadding={0}
      sideNav={
        <SideNav
          collapsible
          resizable={{ defaultWidth: 248, minWidth: 220, maxWidth: 420 }}
          header={
            <SideNavHeading
              heading={coworker.name}
              subheading={coworker.role}
              icon={<Avatar name={coworker.name} size={32} tooltip={false} />}
              headingHref={href("/")}
            />
          }
          footer={
            <SideNavSection title="Account" isHeaderHidden>
              <SideNavItem
                label={`About ${coworker.name}`}
                icon={IdentificationIcon}
                href={href("/juno")}
                isSelected={path.startsWith("/juno")}
              />
              <SideNavItem
                label="Settings"
                icon={Cog6ToothIcon}
                href={href("/settings/general")}
                isSelected={path.startsWith("/settings")}
              />
              <SideNavItem label={shell.me.name} icon={UserCircleIcon} href={href("/settings/profile")} />
            </SideNavSection>
          }
        >
          <SideNavSection title="Menu" isHeaderHidden>
            <SideNavItem label="New chat" icon={PencilSquareIcon} href={href("/")} isSelected={path === "/"} />
            <SideNavItem
              label="Ask, go, do or find"
              icon={MagnifyingGlassIcon}
              onClick={() => setOpen(true)}
              endContent={<Kbd keys="mod+K" />}
            />
            <SideNavItem
              label="Inbox"
              icon={InboxIcon}
              href={href("/inbox")}
              isSelected={path === "/inbox"}
              {...(shell.inbox > 0 ? { endContent: <Badge label={String(shell.inbox)} variant="warning" /> } : {})}
            />
          </SideNavSection>
          <Divider />
          <SideNavSection title="Chats">
            {chats
              .filter((one) => one.under === null)
              .map((one) => (
                <ChatItem key={one.id} chat={one} all={chats} at={chat} href={href} />
              ))}
            <SideNavItem label="All chats" href={href("/chats")} isSelected={path === "/chats"} />
          </SideNavSection>
          <Divider />
          <SideNavSection title="Managers">
            <SideNavItem label="Overview" icon={HomeIcon} href={href("/overview")} isSelected={path === "/overview"} />
            {tree
              .filter((node) => node.above === "root")
              .map((node) => (
                <ManagerItem key={node.id} node={node} tree={tree} at={manager} href={href} />
              ))}
          </SideNavSection>
        </SideNav>
      }
    >
      <VStack as="main" height="100%" gap={0}>
        {children}
      </VStack>
      <Palette
        isOpen={isOpen}
        onOpenChange={setOpen}
        place={placeOf(here, shell)}
        path={path}
        shell={shell}
        onGo={go}
        onShow={(doing) => show(doing, {})}
      />
    </AppShell>
  );
}

/** The one screen whose drawing (`live`) has the chat beside the page: the co-worker walks the person through Triggers. Everywhere else a drawing reaches it by the home composer, the chat page and the palette. */
const WITH_CHAT = /^\/m\/[^/]+\/playbook\/triggers(\/|$)/u;

/** The frame around every page of a workspace, drawn as soon as the workspace has said what is in it. */
export function Shell({ here, children }: { readonly here: Here; readonly children: ReactNode }) {
  const read = useRead("/shell");
  const go = useGo();
  const isOut = read._tag === "Failed" && read.status === 401;
  useEffect(() => {
    if (isOut) go("//sign-in", { replace: true });
  }, [isOut, go]);
  return (
    <Reading
      from="/shell"
      loading={<Waiting />}
      gone={{ title: "This workspace is not here", description: "It was removed, or it is not one you are in." }}
      failed="We could not read this workspace"
    >
      {(shell) => (
        <ShowProvider name={shell.coworker.name} path={here.path}>
          <Frame shell={shell} here={here}>
            {children}
          </Frame>
          {WITH_CHAT.test(here.path) && <Dock name={shell.coworker.name} path={here.path} />}
        </ShowProvider>
      )}
    </Reading>
  );
}

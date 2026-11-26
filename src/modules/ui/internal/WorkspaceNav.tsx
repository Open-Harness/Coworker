import { useState } from "react";
import {
  BookOpenIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  RectangleGroupIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { LIMITS } from "~/modules/protocol/service.ts";
import type { ChatRow, WorkspaceRow } from "~/modules/protocol/types.ts";
import type { WorkspaceNavProps } from "../types.ts";
import { NameDialog } from "./NameDialog.tsx";
import { NavGroup } from "./NavGroup.tsx";
import { PeopleOnline } from "./People.tsx";
import { RevealRow } from "./RevealRow.tsx";
import { RowMenu } from "./RowMenu.tsx";
import { StatusMark } from "./StatusMark.tsx";

type RowProps = { readonly nav: WorkspaceNavProps; readonly workspace: WorkspaceRow };

function ChatItem({ nav, workspace, chat }: RowProps & { readonly chat: ChatRow }) {
  return (
    <RevealRow
      label={chat.title}
      href={nav.links.chat(workspace.id, chat.id)}
      isSelected={nav.selected.workspaceId === workspace.id && nav.selected.chatId === chat.id}
      endContent={<StatusMark status={chat.status} />}
      renderActions={(onOpenChange) => (
        <RowMenu
          kind="chat"
          title={chat.title}
          isPinned={chat.pinned}
          isArchived={chat.archivedAt !== undefined}
          deleteWarning="Its messages are deleted for everyone. Documents it made stay."
          onOpenChange={onOpenChange}
          {...nav.chatHandlers(workspace, chat)}
        />
      )}
    />
  );
}

function WorkspaceItem({ nav, workspace }: RowProps) {
  const chats = workspace.chats.filter(({ archivedAt }) => archivedAt === undefined);
  return (
    <RevealRow
      label={workspace.name}
      icon={RectangleGroupIcon}
      collapsible={{ defaultIsCollapsed: false }}
      renderActions={(onOpenChange) => (
        <RowMenu
          kind="workspace"
          title={workspace.name}
          isPinned={workspace.pinned}
          isArchived={workspace.archivedAt !== undefined}
          deleteWarning="Its chats, documents and schedules are deleted for everyone."
          extraItems={[{ label: "New chat", onClick: () => nav.onNewChat(workspace.id) }]}
          onOpenChange={onOpenChange}
          {...nav.workspaceHandlers(workspace)}
        />
      )}
    >
      <NavGroup>
        {chats.map((chat) => (
          <ChatItem key={chat.id} nav={nav} workspace={workspace} chat={chat} />
        ))}
        {chats.length === 0 && <SideNavItem label="New chat" icon={PlusIcon} href={nav.links.workspace(workspace.id)} />}
      </NavGroup>
    </RevealRow>
  );
}

function NavFooter({ nav }: { readonly nav: WorkspaceNavProps }) {
  const settingsOf = nav.selected.workspaceId ?? nav.workspaces[0]?.id;
  return (
    <SideNavSection title="Account" isHeaderHidden>
      {settingsOf !== undefined && (
        <SideNavItem
          label="Settings"
          icon={Cog6ToothIcon}
          href={nav.links.settings(settingsOf)}
          isSelected={nav.selected.page === "settings"}
        />
      )}
      {nav.adminHref !== undefined && <SideNavItem label="Admin" icon={ShieldCheckIcon} href={nav.adminHref} />}
      <SideNavItem
        label={nav.me.name}
        icon={UserCircleIcon}
        endContent={<PeopleOnline people={nav.people.filter(({ id }) => id !== nav.me.id)} />}
        {...(nav.onChangeName === undefined ? {} : { onClick: nav.onChangeName })}
      />
    </SideNavSection>
  );
}

/** Everything there is to open: workspaces, their chats, search and the library. */
export function WorkspaceNav(nav: WorkspaceNavProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { selected, links, workspaces } = nav;
  const home = selected.workspaceId === undefined ? links.home : links.workspace(selected.workspaceId);
  return (
    <>
      <SideNav
        collapsible
        resizable={{ defaultWidth: 300, minWidth: 220, maxWidth: 420 }}
        header={
          <SideNavHeading
            heading="AI Assistant"
            icon={<NavIcon icon={<Icon icon={SparklesIcon} size="sm" />} />}
            headingHref={links.home}
          />
        }
        footer={<NavFooter nav={nav} />}
      >
        <SideNavSection title="Menu" isHeaderHidden>
          <SideNavItem label="New chat" icon={PlusIcon} href={home} isSelected={selected.page === "home"} />
          <SideNavItem label="Search" icon={MagnifyingGlassIcon} onClick={nav.onSearch} />
          <SideNavItem label="Library" icon={BookOpenIcon} href={links.library} isSelected={selected.page === "library"} />
        </SideNavSection>
        <Divider />
        <SideNavSection title="Workspaces" isHeaderHidden>
          {workspaces
            .filter(({ archivedAt }) => archivedAt === undefined)
            .map((workspace) => (
              <WorkspaceItem key={workspace.id} nav={nav} workspace={workspace} />
            ))}
          <SideNavItem label="New workspace" icon={PlusIcon} onClick={() => setIsCreating(true)} />
        </SideNavSection>
      </SideNav>
      <NameDialog
        isOpen={isCreating}
        title="New workspace"
        description="Everyone on the network can open it."
        label="Name"
        submitLabel="Create"
        maxLength={LIMITS.title}
        onClose={() => setIsCreating(false)}
        onSubmit={(name) => {
          setIsCreating(false);
          nav.onNewWorkspace(name);
        }}
      />
    </>
  );
}

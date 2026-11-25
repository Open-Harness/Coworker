import {
  ArrowRightStartOnRectangleIcon,
  BellIcon,
  AcademicCapIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  CubeIcon,
  DocumentTextIcon,
  HomeIcon,
  InboxIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PresentationChartLineIcon,
  Squares2X2Icon,
  UserCircleIcon,
  UsersIcon,
  ViewColumnsIcon,
} from "@heroicons/react/24/outline";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { mayDo, mayOpen } from "~/modules/access/service.ts";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { Standing } from "~/modules/access/types.ts";
import type { AppNavProps, ManagerLink, Place } from "../types.ts";
import { WorkspaceHeading } from "./WorkspaceHeading.tsx";

const PAGES = [
  { page: "chat", access: "chat", label: "Chat", icon: ChatBubbleLeftRightIcon, href: teamLinks.chat },
  { page: "overview", access: "overview", label: "Overview", icon: PresentationChartLineIcon, href: teamLinks.overview },
  { page: "board", access: "board", label: "Board", icon: ViewColumnsIcon, href: teamLinks.board },
  { page: "mission", access: "mission", label: "Mission", icon: DocumentTextIcon, href: teamLinks.mission },
  { page: "events", access: "events", label: "Events", icon: BoltIcon, href: teamLinks.events },
  {
    page: "settings",
    access: "manager-settings",
    label: "Settings",
    icon: Cog6ToothIcon,
    href: (workspaceId: string, managerId: string) => teamLinks.managerSettings(workspaceId, managerId),
  },
] as const;

const BUILD = [
  { page: "agents", access: "agents", label: "Agents", icon: CpuChipIcon },
  { page: "skills", access: "skills", label: "Skills", icon: AcademicCapIcon },
  { page: "templates", access: "templates", label: "Templates", icon: Squares2X2Icon },
] as const;

function ManagerItem({
  workspaceId,
  manager,
  place,
  standing,
}: {
  readonly workspaceId: string;
  readonly manager: ManagerLink;
  readonly place: Place;
  readonly standing: Standing;
}) {
  const openPage = place.kind === "manager" && place.managerId === manager.managerId ? place.page : undefined;
  return (
    <SideNavItem
      label={manager.name}
      icon={<Avatar name={manager.name} size={20} shape="rounded" tooltip={false} />}
      collapsible={{ defaultIsCollapsed: false }}
    >
      {PAGES.filter(({ access }) => mayOpen(standing, access)).map(({ page, label, icon, href }) => (
        <SideNavItem
          key={page}
          label={label}
          icon={icon}
          href={href(workspaceId, manager.managerId)}
          isSelected={openPage === page}
          {...(page === "settings" ? { "aria-label": `${manager.name} settings` } : {})}
        />
      ))}
    </SideNavItem>
  );
}

/** Everything in the workspace: what waits for you, its managers, and what they are built from. */
export function AppNav({ nav, place, onSignOut, onSearch, onNewManager, extra }: AppNavProps) {
  const { workspace, managers, waiting } = nav;
  const id = workspace.workspaceId;
  return (
    <SideNav
      resizable={{ defaultWidth: 264, minWidth: 220, maxWidth: 400 }}
      header={<WorkspaceHeading workspace={workspace} workspaces={nav.workspaces} />}
      footer={
        <SideNavSection title="Account" isHeaderHidden>
          {mayOpen(nav.standing, "workspace") && (
            <SideNavItem label="Settings" icon={Cog6ToothIcon} href={teamLinks.settings(id, "general")} />
          )}
          <SideNavItem label={nav.me} icon={UserCircleIcon} collapsible={{ defaultIsCollapsed: true }}>
            <SideNavItem label="Profile" icon={UserCircleIcon} href={teamLinks.settings(id, "profile")} />
            <SideNavItem label="Notifications" icon={BellIcon} href={teamLinks.settings(id, "notifications")} />
            <SideNavItem label="Sign out" icon={ArrowRightStartOnRectangleIcon} onClick={onSignOut} />
          </SideNavItem>
        </SideNavSection>
      }
    >
      <SideNavSection title="Menu" isHeaderHidden>
        <SideNavItem label="Home" icon={HomeIcon} href={teamLinks.workspace(id)} isSelected={place.kind === "home"} />
        <SideNavItem
          label="Inbox"
          icon={InboxIcon}
          href={teamLinks.inbox(id)}
          isSelected={place.kind === "inbox"}
          endContent={waiting === 0 ? undefined : <Badge variant="info" label={String(waiting)} />}
        />
        <SideNavItem label="Search" icon={MagnifyingGlassIcon} onClick={onSearch} />
        {mayDo(nav.standing, "manager.create") && <SideNavItem label="New manager" icon={PlusIcon} onClick={onNewManager} />}
      </SideNavSection>
      <SideNavSection title="Managers">
        {managers.map((manager) => (
          <ManagerItem key={manager.managerId} workspaceId={id} manager={manager} place={place} standing={nav.standing} />
        ))}
      </SideNavSection>
      <SideNavSection title="Build">
        {BUILD.filter(({ access }) => mayOpen(nav.standing, access)).map(({ page, label, icon }) => (
          <SideNavItem
            key={page}
            label={label}
            icon={icon}
            href={teamLinks.build(id, page)}
            isSelected={place.kind === "build" && place.page === page}
          />
        ))}
        <SideNavItem label="People" icon={UsersIcon} href={teamLinks.people(id)} isSelected={place.kind === "people"} />
        {mayOpen(nav.standing, "environments") && (
          <SideNavItem label="Environments" icon={CubeIcon} href={teamLinks.environments(id)} isSelected={place.kind === "environments"} />
        )}
      </SideNavSection>
      {extra}
    </SideNav>
  );
}

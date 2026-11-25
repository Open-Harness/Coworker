import {
  ArrowLeftIcon,
  BellIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  KeyIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { SideNav, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { mayOpen } from "~/modules/access/service.ts";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { SettingsPage } from "~/modules/team-core/types.ts";
import type { NavData, Place } from "../types.ts";
import { WorkspaceHeading } from "./WorkspaceHeading.tsx";

type Entry = { readonly page: SettingsPage; readonly label: string; readonly icon: typeof UserCircleIcon };

/** Everyone's own. */
const YOU: readonly Entry[] = [
  { page: "profile", label: "Profile", icon: UserCircleIcon },
  { page: "notifications", label: "Notifications", icon: BellIcon },
];

/** The workspace's, which only Owners open: the server refuses anyone else. */
const WORKSPACE: readonly Entry[] = [
  { page: "general", label: "General", icon: BuildingOfficeIcon },
  { page: "members", label: "Members", icon: UsersIcon },
  { page: "roles", label: "Roles and permissions", icon: ShieldCheckIcon },
  { page: "keys", label: "Keys and connections", icon: KeyIcon },
  { page: "usage", label: "Usage", icon: ChartBarIcon },
  { page: "billing", label: "Billing", icon: CreditCardIcon },
  { page: "security", label: "Security", icon: LockClosedIcon },
  { page: "audit", label: "Audit log", icon: ClipboardDocumentListIcon },
];

/** The settings, in place of the app's sidebar while they are open. Each person is offered only what their role opens. */
export function SettingsNav({ nav, place }: { readonly nav: NavData; readonly place: Place }) {
  const { workspace } = nav;
  const item = ({ page, label, icon }: Entry) => (
    <SideNavItem
      key={page}
      label={label}
      icon={icon}
      href={teamLinks.settings(workspace.workspaceId, page)}
      isSelected={place.kind === "settings" && place.page === page}
    />
  );
  return (
    <SideNav
      resizable={{ defaultWidth: 264, minWidth: 220, maxWidth: 400 }}
      header={<WorkspaceHeading workspace={workspace} workspaces={nav.workspaces} />}
    >
      <SideNavSection title="Leave settings" isHeaderHidden>
        <SideNavItem label={`Back to ${workspace.name}`} icon={ArrowLeftIcon} href={teamLinks.inbox(workspace.workspaceId)} />
      </SideNavSection>
      <SideNavSection title="You">{YOU.map(item)}</SideNavSection>
      {mayOpen(nav.standing, "workspace") && <SideNavSection title={`Workspace · ${workspace.name}`}>{WORKSPACE.map(item)}</SideNavSection>}
    </SideNav>
  );
}

import type { ReactNode } from "react";
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  HomeIcon,
  PlusIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { Center } from "@astryxdesign/core/Center";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { NavIcon } from "@astryxdesign/core/NavIcon";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Frame, links, useDirectory } from "~/modules/app/service.ts";
import type { AdminShellProps } from "../types.ts";
import { adminLinks } from "./links.ts";

const PLACES = [
  { label: "Overview", href: adminLinks.overview, icon: HomeIcon },
  { label: "Create", href: adminLinks.create, icon: PlusIcon },
  { label: "Agents", href: adminLinks.agents, icon: CpuChipIcon },
  { label: "Sessions", href: adminLinks.sessions, icon: ChatBubbleLeftRightIcon },
  { label: "Deployments", href: adminLinks.deployments, icon: RocketLaunchIcon },
] as const;

const isAt = (path: string, href: string): boolean =>
  href === adminLinks.overview ? path.replace(/\/$/u, "") === href : path.startsWith(href);

const AdminNav = ({ path }: AdminShellProps) => (
  <SideNav
    collapsible
    resizable={{ defaultWidth: 300, minWidth: 220, maxWidth: 420 }}
    header={
      <SideNavHeading
        heading="Admin"
        icon={<NavIcon icon={<Icon icon={ShieldCheckIcon} size="sm" />} />}
        headingHref={adminLinks.overview}
      />
    }
    footer={
      <SideNavSection title="Leave" isHeaderHidden>
        <SideNavItem label="Back to chats" icon={ArrowLeftIcon} href={links.home} />
      </SideNavSection>
    }
  >
    <SideNavSection title="Admin" isHeaderHidden>
      {PLACES.map(({ label, href, icon }) => (
        <SideNavItem key={href} label={label} icon={icon} href={href} isSelected={isAt(path, href)} />
      ))}
    </SideNavSection>
  </SideNav>
);

const NotAdmin = () => (
  <Center minHeight="100%">
    <EmptyState
      title="Only administrators can open this"
      description="Ask whoever runs this server to add your email address."
      headingLevel={1}
      actions={<Button label="Back to chats" href={links.home} />}
    />
  </Center>
);

/** The frame around the admin view. The server refuses the same people. */
export function AdminShell({ path, children }: AdminShellProps & { readonly children: ReactNode }) {
  const { loaded, isAdmin } = useDirectory();
  return <Frame sideNav={<AdminNav path={path} />}>{!loaded ? null : isAdmin ? children : <NotAdmin />}</Frame>;
}

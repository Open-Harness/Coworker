import { PlusIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { Avatar } from "@astryxdesign/core/Avatar";
import { NavHeadingMenu, NavHeadingMenuItem } from "@astryxdesign/core/NavMenu";
import { SideNavHeading } from "@astryxdesign/core/SideNav";
import { teamLinks, useNarrow } from "~/modules/team-core/service.ts";
import type { WorkspaceChoice } from "../types.ts";

/** The workspace being looked at, and the way to another one. */
export function WorkspaceHeading({
  workspace,
  workspaces,
}: {
  readonly workspace: WorkspaceChoice;
  readonly workspaces: readonly WorkspaceChoice[];
}) {
  // The bar of a phone has one line.
  const isNarrow = useNarrow();
  return (
    <SideNavHeading
      heading={workspace.name}
      {...(isNarrow ? {} : { subheading: "Co-worker" })}
      icon={<Avatar name={workspace.name} shape="rounded" size={32} tooltip={false} />}
      menu={
        <NavHeadingMenu minWidth={240}>
          {workspaces.map(({ workspaceId, name, address }) => (
            <NavHeadingMenuItem
              key={workspaceId}
              label={workspaceId === workspace.workspaceId ? `${name} (open)` : name}
              description={address}
              href={teamLinks.inbox(workspaceId)}
              icon={<Avatar name={name} shape="rounded" size={24} tooltip={false} />}
            />
          ))}
          <NavHeadingMenuItem label="Your workspaces" href={teamLinks.home} icon={Squares2X2Icon} />
          <NavHeadingMenuItem label="Create a workspace" href={teamLinks.start} icon={PlusIcon} />
        </NavHeadingMenu>
      }
    />
  );
}

import { useCallback } from "react";
import { Load, teamLinks, useLoading } from "~/modules/team-core/service.ts";
import type { MemberData, ScreenProps } from "../types.ts";
import { after } from "./after.ts";
import { MembersScreen } from "./MembersScreen.tsx";
import { useAct } from "./use-act.ts";
import { roleLabel } from "./words.ts";

export function MembersPage({ api, workspaceId }: ScreenProps) {
  const act = useAct();
  const members = useLoading(useCallback(() => api.members(workspaceId), [api, workspaceId]));
  const invites = useLoading(useCallback(() => api.invites(workspaceId), [api, workspaceId]));
  const joining = useLoading(useCallback(() => api.joining(workspaceId), [api, workspaceId]));
  const permissions = useLoading(useCallback(() => api.permissions(workspaceId), [api, workspaceId]));
  const retry = () => {
    members.reload();
    invites.reload();
    joining.reload();
  };
  const changesOf = (member: MemberData) => {
    if (permissions.loaded?._tag !== "Loaded") return undefined;
    const person = permissions.loaded.value.find(({ email }) => email.toLowerCase() === member.email.toLowerCase());
    return person === undefined
      ? undefined
      : { count: person.changes.length, href: `${teamLinks.settings(workspaceId, "roles")}?person=${encodeURIComponent(person.person)}` };
  };
  return (
    <Load loaded={members.loaded} failedTitle="Members did not load" onRetry={retry}>
      {(team) => (
        <Load loaded={invites.loaded} failedTitle="Invites did not load" onRetry={retry}>
          {(waiting) => (
            <Load loaded={joining.loaded} failedTitle="Joining did not load" onRetry={retry}>
              {(settings) => (
                <MembersScreen
                  members={team}
                  invites={waiting}
                  joining={settings}
                  origin={api.origin}
                  changesOf={changesOf}
                  onInvite={(email, role, again) =>
                    act(api.invite(workspaceId, email, role, again), again ? `Sent again to ${email}` : `Invited ${email}`, invites.reload)
                  }
                  onCancel={(id) => act(api.cancelInvite(id), "Invite revoked", invites.reload)}
                  onRole={(id, role) =>
                    act(api.setRole(workspaceId, id, role), `Now ${roleLabel(role)}`, () => {
                      members.reload();
                      permissions.reload();
                    })
                  }
                  onRemove={(id) => after(api.removeMember(workspaceId, id), members.reload)}
                  onLinks={(on) => act(api.setLinks(workspaceId, on), on ? "The link is on" : "The link is off", joining.show)}
                  onDomains={(domains) => act(api.setDomains(workspaceId, domains), "Domains saved", joining.show)}
                />
              )}
            </Load>
          )}
        </Load>
      )}
    </Load>
  );
}

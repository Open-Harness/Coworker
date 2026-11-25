import { useCallback } from "react";
import { Load, teamLinks, useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { ScreenProps } from "../types.ts";
import { after } from "./after.ts";
import { LinkedAccounts } from "./LinkedAccounts.tsx";
import { NotificationsScreen } from "./NotificationsScreen.tsx";
import { ProfileScreen } from "./ProfileScreen.tsx";
import { SignIns } from "./SignIns.tsx";
import { useAct } from "./use-act.ts";

function Accounts({ api, workspaceId, email }: ScreenProps & { readonly email: string }) {
  const { goTo } = useBrowser();
  const { loaded, reload } = useLoading(useCallback(() => api.people(workspaceId), [api, workspaceId]));
  const ways = useLoading(api.account.ways);
  const linked = useLoading(api.account.linked);
  const connected = linked.loaded?._tag === "Loaded" ? linked.loaded.value : undefined;
  return (
    <Load loaded={loaded} failedTitle="Your accounts did not load" onRetry={reload}>
      {(people) => (
        <LinkedAccounts
          handles={people.find(({ person }) => person === `email:${email.toLowerCase()}`)?.handles ?? []}
          offered={
            ways.loaded?._tag === "Loaded" && connected !== undefined ? ways.loaded.value.filter((way) => !connected.includes(way)) : []
          }
          onConnect={(way) => after(api.account.link(way, teamLinks.settings(workspaceId, "profile")), goTo)}
          onEmail={api.account.addEmail}
        />
      )}
    </Load>
  );
}

function Places({ api }: Pick<ScreenProps, "api">) {
  const act = useAct();
  const { loaded, reload } = useLoading(api.account.signIns);
  return (
    <Load loaded={loaded} failedTitle="Your sign-ins did not load" onRetry={reload}>
      {(signIns) => (
        <SignIns
          signIns={signIns}
          onSignOut={(token) => act(api.account.signOutOf(token), "Signed out", reload)}
          onSignOutElsewhere={() => after(api.account.signOutElsewhere(), reload)}
        />
      )}
    </Load>
  );
}

/** Everyone's own: their profile here, and what is sent to their email. */
export function ProfilePage({ api, workspaceId }: ScreenProps) {
  const { loaded, reload } = useLoading(useCallback(() => api.me(workspaceId), [api, workspaceId]));
  const workspace = useLoading(useCallback(() => api.workspace(workspaceId), [api, workspaceId]));
  return (
    <Load loaded={loaded} failedTitle="Your profile did not load" onRetry={reload}>
      {(me) => (
        <ProfileScreen
          me={me}
          workspaceName={workspace.loaded?._tag === "Loaded" ? workspace.loaded.value.name : "the workspace"}
          onSave={(profile) => after(api.saveProfile(workspaceId, profile), reload)}
          onName={(name) => after(api.account.saveName(name), reload)}
          accounts={<Accounts api={api} workspaceId={workspaceId} email={me.email} />}
          signIns={<Places api={api} />}
        />
      )}
    </Load>
  );
}

export function NotificationsPage({ api, workspaceId }: ScreenProps) {
  const { loaded, reload } = useLoading(useCallback(() => api.me(workspaceId), [api, workspaceId]));
  return (
    <Load loaded={loaded} failedTitle="Your notifications did not load" onRetry={reload}>
      {({ notifications }) => (
        <NotificationsScreen notifications={notifications} onSave={(next) => after(api.saveNotifications(workspaceId, next), reload)} />
      )}
    </Load>
  );
}

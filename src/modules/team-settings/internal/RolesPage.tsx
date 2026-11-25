import { useCallback } from "react";
import { Load, useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { ScreenProps } from "../types.ts";
import { after } from "./after.ts";
import { RolesScreen } from "./RolesScreen.tsx";

export function RolesPage({ api, workspaceId }: ScreenProps) {
  const { here } = useBrowser();
  const roles = useLoading(useCallback(() => api.roles(workspaceId), [api, workspaceId]));
  const people = useLoading(useCallback(() => api.permissions(workspaceId), [api, workspaceId]));
  const initial = new URLSearchParams(here().split("?")[1] ?? "").get("person") ?? undefined;
  const retry = () => {
    roles.reload();
    people.reload();
  };
  return (
    <Load loaded={roles.loaded} failedTitle="Roles did not load" onRetry={retry}>
      {(value) => (
        <Load loaded={people.loaded} failedTitle="People did not load" onRetry={retry}>
          {(list) => (
            <RolesScreen
              roles={value}
              people={list}
              initialPerson={initial}
              onChange={(change) => after(api.setChange(workspaceId, change), people.reload)}
            />
          )}
        </Load>
      )}
    </Load>
  );
}

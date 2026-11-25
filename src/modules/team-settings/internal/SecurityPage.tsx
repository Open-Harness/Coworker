import { useCallback } from "react";
import { Load, useLoading } from "~/modules/team-core/service.ts";
import { Page } from "~/modules/ui/service.ts";
import type { ScreenProps } from "../types.ts";
import { Joining } from "./Joining.tsx";
import { useAct } from "./use-act.ts";

/** How people get in without an emailed invite: the invite link and the approved domains. */
export function SecurityPage({ api, workspaceId }: ScreenProps) {
  const act = useAct();
  const { loaded, reload, show } = useLoading(useCallback(() => api.joining(workspaceId), [api, workspaceId]));
  return (
    <Page title="Security" description="Who can join without an emailed invite. Each person who joins takes a seat.">
      <Load loaded={loaded} failedTitle="Security did not load" onRetry={reload}>
        {(joining) => (
          <Joining
            joining={joining}
            origin={api.origin}
            onLinks={(on) => act(api.setLinks(workspaceId, on), on ? "The link is on" : "The link is off", show)}
            onDomains={(domains) => act(api.setDomains(workspaceId, domains), "Domains saved", show)}
          />
        )}
      </Load>
    </Page>
  );
}

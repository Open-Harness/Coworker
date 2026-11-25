import { useCallback } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Load, useLoading } from "~/modules/team-core/service.ts";
import { useTeamApi } from "./context.ts";
import { NeedsYou } from "./NeedsYou.tsx";
import { useAnswer } from "./use-answer.ts";

/** Loads one Inbox item and sends the person's reply. */
export function NeedsYouPage({ workspaceId, itemId }: { readonly workspaceId: string; readonly itemId: string }) {
  const api = useTeamApi();
  const { loaded, show } = useLoading(useCallback(() => api.item(workspaceId, itemId), [api, workspaceId, itemId]));
  const { failure, send } = useAnswer(workspaceId, show);
  return (
    <Load loaded={loaded} failedTitle="This item did not load">
      {(item) => (
        <>
          {failure !== undefined && <Banner status="error" container="section" title="Your answer was not sent" description={failure} />}
          <NeedsYou workspaceId={workspaceId} item={item} onReply={(reply) => send(itemId, reply)} />
        </>
      )}
    </Load>
  );
}

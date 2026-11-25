import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { teamLinks } from "~/modules/team-core/service.ts";

/** What stands where a page the person's role may not open would be. The workspace's own settings say they are the Owners'. It never shows the page, nor asks it for anything. */
export function NoAccess({ workspaceId, isOwnersOnly }: { readonly workspaceId: string; readonly isOwnersOnly: boolean }) {
  return (
    <Center minHeight="60dvh">
      <EmptyState
        title={isOwnersOnly ? "Only Owners open this page" : "You can't open this page"}
        description="Your role doesn't include it. Ask an Owner of the workspace if you need it."
        headingLevel={1}
        actions={<Button label="Back to the Inbox" href={teamLinks.inbox(workspaceId)} />}
      />
    </Center>
  );
}

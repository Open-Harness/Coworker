import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { List, ListItem } from "@astryxdesign/core/List";
import { Load, teamLinks, useLoading } from "~/modules/team-core/service.ts";
import { Page } from "~/modules/ui/service.ts";
import type { WorkspacesPageProps } from "../types.ts";

/** Someone who asked to join sees the workspace appear when an Owner lets them in. */
const REFRESH_MS = 5_000;

/** Every workspace the person is in. */
export function WorkspacesPage({ api, empty }: WorkspacesPageProps) {
  const { loaded } = useLoading(api.workspaces, REFRESH_MS);
  return (
    <Load loaded={loaded} failedTitle="Your workspaces did not load">
      {(workspaces) =>
        workspaces.length === 0 ? (
          empty
        ) : (
          <Page title="Your workspaces" endContent={<Button label="Create a workspace" href={teamLinks.start} />}>
            <Card padding={0}>
              <List hasDividers>
                {workspaces.map(({ workspaceId, name, address }) => (
                  <ListItem
                    key={workspaceId}
                    label={name}
                    description={address}
                    startContent={<Avatar name={name} shape="rounded" size={32} tooltip={false} />}
                    href={teamLinks.inbox(workspaceId)}
                  />
                ))}
              </List>
            </Card>
          </Page>
        )
      }
    </Load>
  );
}

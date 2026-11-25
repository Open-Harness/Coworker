import { useCallback, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Load, useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { GitHubData } from "~/modules/team-settings/types.ts";
import type { Hearing, ManagerAt, StepProps } from "../types.ts";
import { Wizard } from "./Wizard.tsx";

function Place({ name, about, children }: { readonly name: string; readonly about: string; readonly children: React.ReactNode }) {
  return (
    <HStack gap={4} vAlign="center">
      <StackItem size="fill">
        <VStack gap={0}>
          <Text weight="medium">{name}</Text>
          <Text type="supporting">{about}</Text>
        </VStack>
      </StackItem>
      <StackItem>{children}</StackItem>
    </HStack>
  );
}

function GitHub({
  gitHub,
  hearing,
  onHear,
}: {
  readonly gitHub: GitHubData;
  readonly hearing: Hearing;
  readonly onHear: (repos: readonly string[]) => Promise<void>;
}) {
  const { goTo } = useBrowser();
  const { account, installUrl } = gitHub;
  if (account === undefined)
    return (
      <Place
        name="GitHub"
        about={installUrl === undefined ? "Not set up on this server yet." : "Install the GitHub App, then pick the repos it hears."}
      >
        {installUrl === undefined ? <Badge label="Not available" /> : <Button label="Connect GitHub" onClick={() => goTo(installUrl)} />}
      </Place>
    );
  return (
    <VStack gap={4}>
      <Place name="GitHub" about={`Connected to ${account}. It hears issues, pull requests and checks on the repos you pick.`}>
        <Badge variant="success" label="Connected" />
      </Place>
      <CheckboxList label="Repos" value={[...hearing.heard]} changeAction={onHear}>
        {hearing.repos.map((repo) => (
          <CheckboxListItem key={repo} value={repo} label={repo} />
        ))}
      </CheckboxList>
    </VStack>
  );
}

/** Where the manager hears about work besides its chat. */
export function Listen({ api, workspaceId, frame, next, manager }: StepProps & { readonly manager: ManagerAt }) {
  const { settings } = api;
  const { managerId, name, address } = manager;
  const { loaded: gitHub } = useLoading(useCallback(() => settings.gitHub(workspaceId, managerId), [settings, workspaceId, managerId]));
  const { loaded: hearing, show } = useLoading(useCallback(() => api.hearing(workspaceId, managerId), [api, workspaceId, managerId]));
  const [failure, setFailure] = useState<string>();
  const hear = async (repos: readonly string[], current: Hearing) => {
    const saved = await api.hear(workspaceId, managerId, repos);
    setFailure(saved._tag === "Failed" ? saved.message : undefined);
    if (saved._tag === "Loaded") show({ ...current, heard: repos });
  };
  const isConnected = gitHub?._tag === "Loaded" && gitHub.value.account !== undefined;
  return (
    <Wizard
      frame={frame}
      title="Where should it hear about work?"
      description={`${name}'s chat always works. Add places people already talk.`}
      failure={failure === undefined ? undefined : { title: "The repos were not saved", description: failure }}
      action={<Button label="Continue" variant="primary" onClick={() => next({ managerId })} />}
      skip={
        isConnected ? undefined : <Button label="Only its chat and email for now" variant="ghost" onClick={() => next({ managerId })} />
      }
    >
      <VStack gap={3}>
        <Card padding={5}>
          <Place name="Email" about={`Write to ${address}. Anyone in the workspace can.`}>
            <Badge variant="success" label="Ready" />
          </Place>
        </Card>
        <Card padding={5}>
          <Load loaded={gitHub} failedTitle="GitHub did not load">
            {(connection) => (
              <Load loaded={hearing} failedTitle="The repos did not load">
                {(current) => <GitHub gitHub={connection} hearing={current} onHear={(repos) => hear(repos, current)} />}
              </Load>
            )}
          </Load>
        </Card>
        <Text type="supporting">Slack and other chat apps are not available yet.</Text>
      </VStack>
    </Wizard>
  );
}

import { useCallback, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { useBrowser, useLoading } from "~/modules/team-core/service.ts";
import type { BuildApi, GitHubEvent, GitHubSources, RepoSourceData } from "../types.ts";
import { Fetch } from "./Fetch.tsx";
import { GitHubLost } from "./GitHubLost.tsx";
import { LeaveGuard } from "./LeaveGuard.tsx";
import { SaveBar } from "./SaveBar.tsx";
import { useSave } from "./use-save.ts";
import { EVENTS } from "./decode-sources.ts";
import { EVENT_LABEL } from "./words.ts";

const STARTING: readonly GitHubEvent[] = ["issues", "issue_comment"];

const key = (repos: readonly RepoSourceData[]): string =>
  JSON.stringify([...repos].sort((one, other) => one.repo.localeCompare(other.repo)).map(({ repo, events }) => [repo, [...events].sort()]));

function Repos({
  github,
  canEdit,
  onSave,
}: {
  readonly github: GitHubSources;
  readonly canEdit: boolean;
  readonly onSave: (
    repos: readonly RepoSourceData[],
  ) => Promise<{ readonly _tag: "Loaded"; readonly value: GitHubSources } | { readonly _tag: "Failed"; readonly message: string }>;
}) {
  const [draft, setDraft] = useState(github.listening);
  const { state, run, reset } = useSave();
  const isDirty = key(draft) !== key(github.listening);
  const eventsOf = (repo: string): readonly GitHubEvent[] | undefined => draft.find((one) => one.repo === repo)?.events;
  const set = (repo: string, events: readonly GitHubEvent[] | undefined) =>
    setDraft([...draft.filter((one) => one.repo !== repo), ...(events === undefined ? [] : [{ repo, events }])]);
  const save = async () => {
    const saved = await run(() => onSave(draft));
    if (saved !== undefined) setDraft(saved.listening);
  };
  return (
    <VStack gap={4}>
      <LeaveGuard isDirty={isDirty} />
      {github.repos.length === 0 && (
        <EmptyState title="The App reaches no repo" description="Give it a repo on GitHub, then come back." isCompact />
      )}
      {github.repos.map((repo) => {
        const events = eventsOf(repo);
        return (
          <Card key={repo} padding={4}>
            <VStack gap={3}>
              <Switch
                label={repo}
                description={events === undefined ? "Not listening" : `Listening to ${events.length} kinds of event`}
                value={events !== undefined}
                isDisabled={!canEdit}
                onChange={(on) => set(repo, on ? STARTING : undefined)}
              />
              {events !== undefined && (
                <CheckboxList
                  label={`What ${repo} sends`}
                  value={[...events]}
                  isDisabled={!canEdit}
                  onChange={(next) =>
                    set(
                      repo,
                      EVENTS.filter((event) => next.includes(event)),
                    )
                  }
                >
                  {EVENTS.map((event) => (
                    <CheckboxListItem key={event} value={event} label={EVENT_LABEL[event]} />
                  ))}
                </CheckboxList>
              )}
            </VStack>
          </Card>
        );
      })}
      {canEdit && (
        <SaveBar
          state={state}
          isDirty={isDirty}
          label="Save repos"
          onSave={save}
          onDiscard={() => {
            setDraft(github.listening);
            reset();
          }}
        />
      )}
    </VStack>
  );
}

/** The repos this manager hears and, for each, which events. Connecting the App is the Owner's. */
export function GitHubSource({
  api,
  workspaceId,
  managerId,
  role,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly managerId: string;
  readonly role: "owner" | "builder" | "member";
}) {
  const github = useLoading(useCallback(() => api.github(workspaceId, managerId), [api, workspaceId, managerId]));
  const install = useLoading(useCallback(() => api.installUrl(workspaceId, managerId), [api, workspaceId, managerId]));
  const { goTo } = useBrowser();
  const url = install.loaded?._tag === "Loaded" ? install.loaded.value.url : undefined;
  return (
    <Fetch loading={github} failedTitle="GitHub did not load">
      {(value) =>
        value.account === undefined && value.lost !== undefined ? (
          <GitHubLost lost={value.lost} role={role} url={url} />
        ) : value.account === undefined ? (
          <EmptyState
            title="GitHub is not connected"
            description={
              url === undefined
                ? "This deployment has no GitHub App to install yet."
                : role === "owner"
                  ? "Install the App on your account, then choose the repos this manager hears."
                  : "An Owner connects GitHub for the workspace. Then you choose the repos here."
            }
            actions={
              role === "owner" && url !== undefined ? (
                <Button label="Connect GitHub" variant="primary" onClick={() => goTo(url)} />
              ) : undefined
            }
          />
        ) : (
          <VStack gap={4}>
            <HStack gap={3} vAlign="center">
              <StackItem size="fill">
                <Text>{`Connected as ${value.account}. The App reaches ${value.repos.length} ${value.repos.length === 1 ? "repo" : "repos"}.`}</Text>
              </StackItem>
            </HStack>
            {role === "member" && <Banner status="info" title="Only Owners and Builders change this. You can read it." />}
            <Repos
              github={value}
              canEdit={role !== "member"}
              onSave={async (repos) => {
                const result = await api.setRepos(workspaceId, managerId, repos);
                if (result._tag === "Loaded") github.show(result.value);
                return result;
              }}
            />
          </VStack>
        )
      }
    </Fetch>
  );
}

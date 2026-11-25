import { useCallback } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { PLAIN_AGENT } from "~/modules/agents/types.ts";
import { Load, useLoading } from "~/modules/team-core/service.ts";
import { after } from "./after.ts";
import { EnvironmentsScreen } from "./EnvironmentsScreen.tsx";
import { PeopleScreen } from "./PeopleScreen.tsx";
import { useAct } from "./use-act.ts";
import { useSettingsApi } from "./use-settings-api.ts";

export function EnvironmentsPage({ workspaceId }: { readonly workspaceId: string }) {
  const api = useSettingsApi();
  const act = useAct();
  const showToast = useToast();
  const environments = useLoading(useCallback(() => api.environments(workspaceId), [api, workspaceId]));
  const secrets = useLoading(useCallback(() => api.secrets(workspaceId), [api, workspaceId]));
  const agents = useLoading(useCallback(() => api.agentNames(workspaceId), [api, workspaceId]));
  const test = useCallback(
    async (environmentId: string) => {
      const result = await api.testEnvironment(workspaceId, environmentId);
      environments.reload();
      return result;
    },
    [api, workspaceId, environments.reload],
  );
  const retry = () => {
    environments.reload();
    secrets.reload();
    agents.reload();
  };
  return (
    <Load loaded={environments.loaded} failedTitle="Environments did not load" onRetry={retry}>
      {(list) => (
        <Load loaded={secrets.loaded} failedTitle="Secrets did not load" onRetry={retry}>
          {(names) => (
            <EnvironmentsScreen
              environments={list}
              secrets={names}
              agents={[...new Set([PLAIN_AGENT, ...(agents.loaded?._tag === "Loaded" ? agents.loaded.value : [])])]}
              onSave={(input) => after(api.saveEnvironment(workspaceId, input), environments.reload)}
              onAssign={(agent, id) =>
                act(
                  api.assignAgent(workspaceId, agent, id),
                  id === undefined ? `${agent} left the environment` : `${agent} runs here now`,
                  environments.reload,
                )
              }
              onSecret={(name, value) => after(api.storeSecret(workspaceId, name, value), secrets.reload)}
              onRemoveSecret={(name) =>
                after(api.removeSecret(workspaceId, name), (usedBy) => {
                  showToast({ body: usedBy.length === 0 ? `${name} was removed` : `${name} was removed. ${usedBy.join(", ")} named it.` });
                  secrets.reload();
                })
              }
              onDelete={({ id, name }) =>
                after(api.deleteEnvironment(workspaceId, id), (left) => {
                  showToast({ body: left.length === 0 ? `${name} was deleted` : `${name} was deleted. ${left.join(", ")} left it.` });
                  retry();
                })
              }
              onTest={test}
            />
          )}
        </Load>
      )}
    </Load>
  );
}

export function PeoplePage({ workspaceId }: { readonly workspaceId: string }) {
  const api = useSettingsApi();
  const { loaded, reload } = useLoading(useCallback(() => api.people(workspaceId), [api, workspaceId]));
  return (
    <Load loaded={loaded} failedTitle="People did not load" onRetry={reload}>
      {(people) => <PeopleScreen people={people} onAdd={(input) => after(api.addHandle(workspaceId, input), reload)} />}
    </Load>
  );
}

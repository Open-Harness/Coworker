import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Text";
import { teamLinks, useLoading } from "~/modules/team-core/service.ts";
import { AgentForm } from "./AgentForm.tsx";
import { Fetch } from "./Fetch.tsx";
import { MasterDetail } from "./MasterDetail.tsx";
import { useBuildApi, useGeneral } from "./use-api.ts";
import { BUILDERS_ONLY } from "./words.ts";

/** The workspace's agents: each a name, instructions, a model, tools, skills and an environment. A manager starts them on tasks. */
export function Agents({ workspaceId, itemId }: { readonly workspaceId: string; readonly itemId?: string | undefined }) {
  const api = useBuildApi();
  const router = useRouter();
  const general = useGeneral(api, workspaceId);
  const agents = useLoading(useCallback(() => api.agents(workspaceId), [api, workspaceId]));
  const skills = useLoading(useCallback(() => api.skills(workspaceId), [api, workspaceId]));
  const role = general.loaded?._tag === "Loaded" ? general.loaded.value.role : "member";
  const models = general.loaded?._tag === "Loaded" ? general.loaded.value.models : [];
  const link = (id?: string) => teamLinks.build(workspaceId, "agents", id);
  return (
    <Fetch loading={agents} failedTitle="Agents did not load">
      {({ agents: all, options }) => {
        const open = itemId === "new" ? "new" : all.find(({ id }) => id === itemId);
        return (
          <MasterDetail
            title="Agents"
            description="What a manager starts on a task. Each save is a new version, and a run keeps the version it began with."
            backHref={link()}
            backLabel="All agents"
            endContent={
              role === "member" ? undefined : (
                <Button label="New agent" variant="primary" href={link("new")} icon={<Icon icon={PlusIcon} size="sm" />} />
              )
            }
            list={
              all.length === 0 ? (
                <EmptyState title="No agents yet" description="Make one, then a manager can start it on a task." isCompact />
              ) : (
                <List hasDividers>
                  {all.map(({ id, config, version }) => (
                    <ListItem
                      key={id}
                      label={config.name}
                      description={`Version ${version}`}
                      href={link(id)}
                      isSelected={open !== "new" && open?.id === id}
                    />
                  ))}
                </List>
              )
            }
            detail={
              open === undefined ? (
                itemId === undefined ? undefined : (
                  <EmptyState title="No such agent" description="It may have been deleted." isCompact />
                )
              ) : (
                <VStack gap={4}>
                  {role === "member" && <Banner status="info" title={BUILDERS_ONLY} />}
                  <Heading level={2}>{open === "new" ? "New agent" : open.config.name}</Heading>
                  <AgentForm
                    key={open === "new" ? "new" : open.id}
                    api={api}
                    workspaceId={workspaceId}
                    agent={open === "new" ? undefined : open}
                    options={options}
                    models={models}
                    skills={skills.loaded?._tag === "Loaded" ? skills.loaded.value.map(({ name }) => name) : []}
                    canEdit={role !== "member"}
                    onSaved={agents.reload}
                    onDeleted={() => {
                      agents.reload();
                      router.history.push(link());
                    }}
                  />
                </VStack>
              )
            }
          />
        );
      }}
    </Fetch>
  );
}

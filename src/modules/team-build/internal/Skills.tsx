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
import { Fetch } from "./Fetch.tsx";
import { MasterDetail } from "./MasterDetail.tsx";
import { SkillForm } from "./SkillForm.tsx";
import { useBuildApi, useGeneral } from "./use-api.ts";
import { BUILDERS_ONLY } from "./words.ts";

/** The workspace's skills: folders of instructions and scripts an agent can use. */
export function Skills({ workspaceId, itemId }: { readonly workspaceId: string; readonly itemId?: string | undefined }) {
  const api = useBuildApi();
  const router = useRouter();
  const general = useGeneral(api, workspaceId);
  const skills = useLoading(useCallback(() => api.skills(workspaceId), [api, workspaceId]));
  const role = general.loaded?._tag === "Loaded" ? general.loaded.value.role : "member";
  const link = (id?: string) => teamLinks.build(workspaceId, "skills", id);
  return (
    <Fetch loading={skills} failedTitle="Skills did not load">
      {(all) => {
        const open = itemId === "new" ? "new" : all.find(({ id }) => id === itemId);
        return (
          <MasterDetail
            title="Skills"
            description="Folders of instructions and scripts. An agent that lists a skill can read and use it."
            backHref={link()}
            backLabel="All skills"
            endContent={
              role === "member" ? undefined : (
                <Button label="New skill" variant="primary" href={link("new")} icon={<Icon icon={PlusIcon} size="sm" />} />
              )
            }
            list={
              all.length === 0 ? (
                <EmptyState
                  title="No skills yet"
                  description="A skill teaches an agent one job, such as reading a hard web page."
                  isCompact
                />
              ) : (
                <List hasDividers>
                  {all.map(({ id, name, version, files }) => (
                    <ListItem
                      key={id}
                      label={name}
                      description={`Version ${version} · ${Object.keys(files).length} files`}
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
                  <EmptyState title="No such skill" description="It may have been deleted." isCompact />
                )
              ) : (
                <VStack gap={4}>
                  {role === "member" && <Banner status="info" title={BUILDERS_ONLY} />}
                  <Heading level={2}>{open === "new" ? "New skill" : open.name}</Heading>
                  <SkillForm
                    key={open === "new" ? "new" : open.id}
                    api={api}
                    workspaceId={workspaceId}
                    skill={open === "new" ? undefined : open}
                    canEdit={role !== "member"}
                    onSaved={skills.reload}
                    onDeleted={() => {
                      skills.reload();
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

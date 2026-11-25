import { useCallback } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { teamLinks, useLoading, useNarrow } from "~/modules/team-core/service.ts";
import { PageSection } from "~/modules/ui/service.ts";
import type { ManagerInfo, TaskPage } from "../types.ts";
import { Fetch } from "./Fetch.tsx";
import { TaskComments, TaskHistory, TaskMandate, TaskRuns } from "./TaskActivity.tsx";
import { TaskDetailsForm } from "./TaskDetailsForm.tsx";
import { TaskTextForm } from "./TaskTextForm.tsx";
import { useBuildApi } from "./use-api.ts";

/** How often an open task asks for what changed on it. */
const REFRESH_MS = 5_000;

/** One task as a page: what it says, where it is, who answers for it, who worked on it and what was said. */
export function TaskScreen({
  workspaceId,
  managerId,
  taskId,
}: {
  readonly workspaceId: string;
  readonly managerId: string;
  readonly taskId: string;
}) {
  const api = useBuildApi();
  const isNarrow = useNarrow();
  const task = useLoading(
    useCallback(() => api.task(workspaceId, managerId, taskId), [api, workspaceId, managerId, taskId]),
    REFRESH_MS,
  );
  const manager = useLoading(useCallback(() => api.manager(workspaceId, managerId), [api, workspaceId, managerId]));
  const people = useLoading(useCallback(() => api.people(workspaceId), [api, workspaceId]));
  const name = manager.loaded?._tag === "Loaded" ? manager.loaded.value.name : "Manager";
  const page: TaskPage | undefined = task.loaded?._tag === "Loaded" ? task.loaded.value : undefined;
  const info: ManagerInfo | undefined = manager.loaded?._tag === "Loaded" ? manager.loaded.value : undefined;
  const details =
    page === undefined || info === undefined ? undefined : (
      <VStack gap={6}>
        <PageSection title="Details">
          <TaskDetailsForm
            api={api}
            workspaceId={workspaceId}
            managerId={managerId}
            task={page}
            manager={info}
            people={people.loaded?._tag === "Loaded" ? people.loaded.value : []}
            onSaved={task.reload}
          />
        </PageSection>
        <TaskMandate task={page} />
      </VStack>
    );
  return (
    <Layout
      height="fill"
      contentWidth={1260}
      header={
        <LayoutHeader padding={4} hasDivider>
          <VStack gap={1}>
            <Breadcrumbs variant="supporting">
              <BreadcrumbItem href={teamLinks.board(workspaceId, managerId)}>{name}</BreadcrumbItem>
              <BreadcrumbItem href={teamLinks.board(workspaceId, managerId)}>Board</BreadcrumbItem>
              <BreadcrumbItem isCurrent>{taskId}</BreadcrumbItem>
            </Breadcrumbs>
            <Heading level={1} maxLines={2}>
              {page?.title ?? taskId}
            </Heading>
            {page !== undefined && (
              <HStack gap={2} wrap="wrap" vAlign="center">
                <Text type="supporting">{page.id}</Text>
                {page.stageLabel !== "" && <Badge variant="info" label={page.stageLabel} />}
              </HStack>
            )}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={4} role="main">
          <Fetch loading={task} failedTitle="The task did not load">
            {(value) => (
              <Fetch loading={manager} failedTitle="The board did not load">
                {() => (
                  <VStack gap={6}>
                    <PageSection title="Description">
                      <TaskTextForm api={api} workspaceId={workspaceId} managerId={managerId} task={value} onSaved={task.reload} />
                    </PageSection>
                    <Divider />
                    <TaskRuns workspaceId={workspaceId} managerId={managerId} task={value} />
                    <Divider />
                    <TaskComments api={api} workspaceId={workspaceId} managerId={managerId} task={value} onSaved={task.reload} />
                    <Divider />
                    <TaskHistory task={value} />
                    {isNarrow && details !== undefined && (
                      <>
                        <Divider />
                        {details}
                      </>
                    )}
                  </VStack>
                )}
              </Fetch>
            )}
          </Fetch>
        </LayoutContent>
      }
      end={
        !isNarrow && details !== undefined ? (
          <LayoutPanel width={340} padding={4} role="complementary" hasDivider>
            {details}
          </LayoutPanel>
        ) : undefined
      }
    />
  );
}

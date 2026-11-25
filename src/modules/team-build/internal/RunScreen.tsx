import { useCallback } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { teamLinks, useLoading } from "~/modules/team-core/service.ts";
import { Fetch } from "./Fetch.tsx";
import { RunLines } from "./RunLines.tsx";
import { RunReport } from "./RunReport.tsx";
import { useBuildApi } from "./use-api.ts";
import { type Presser, usePress } from "./use-press.ts";

/** How often an open run asks for new lines: what it writes shows up on the page about this often. */
const REFRESH_MS = 800;

/** Stops a run that is going. Pressing it twice, or on a run that ended, changes nothing more. */
function StopRun({ presser, runId }: { readonly presser: Presser; readonly runId: string }) {
  return (
    <Button
      label="Stop run"
      variant="destructive"
      isDisabled={presser.saver.state._tag === "saving"}
      clickAction={async () => void (await presser.press("run.stop", { run: runId }))}
    />
  );
}

/** One run of an agent on a task: what it was asked, what it did and what it reported, with a way to stop it while it goes. */
export function RunScreen({
  workspaceId,
  managerId,
  runId,
}: {
  readonly workspaceId: string;
  readonly managerId: string;
  readonly runId: string;
}) {
  const api = useBuildApi();
  const run = useLoading(
    useCallback(() => api.run(workspaceId, managerId, runId), [api, workspaceId, managerId, runId]),
    REFRESH_MS,
  );
  const manager = useLoading(useCallback(() => api.manager(workspaceId, managerId), [api, workspaceId, managerId]));
  const presser = usePress(api, workspaceId, managerId, run.reload);
  const name = manager.loaded?._tag === "Loaded" ? manager.loaded.value.name : "Manager";
  const data = run.loaded?._tag === "Loaded" ? run.loaded.value : undefined;
  return (
    <Layout
      height="fill"
      contentWidth={900}
      header={
        <LayoutHeader padding={4} hasDivider>
          <VStack gap={3}>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <VStack gap={0.5}>
                  <Breadcrumbs variant="supporting">
                    <BreadcrumbItem href={teamLinks.board(workspaceId, managerId)}>{name}</BreadcrumbItem>
                    {data !== undefined && (
                      <BreadcrumbItem href={teamLinks.task(workspaceId, managerId, data.task)}>{data.task}</BreadcrumbItem>
                    )}
                    <BreadcrumbItem isCurrent>{runId}</BreadcrumbItem>
                  </Breadcrumbs>
                  <Heading level={1}>{data === undefined ? runId : `${data.role} on ${data.task}`}</Heading>
                  {data !== undefined && <Text type="supporting">{`Attempt ${data.attempt} · ${data.agent}`}</Text>}
                </VStack>
              </StackItem>
              {data !== undefined && data.state !== "ended" && <StopRun presser={presser} runId={runId} />}
            </HStack>
            {data !== undefined && <RunReport run={data} />}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent padding={4}>
          <Fetch loading={run} failedTitle="The run did not load">
            {(value) => (
              <VStack gap={4}>
                {presser.saver.state._tag === "failed" && (
                  <Banner status="error" title="Not stopped" description={presser.saver.state.message} />
                )}
                {presser.waiting !== undefined && <Banner status="info" title="Waiting for an Owner" description={presser.waiting} />}
                <Heading level={2}>Transcript</Heading>
                <RunLines run={value} />
              </VStack>
            )}
          </Fetch>
        </LayoutContent>
      }
    />
  );
}

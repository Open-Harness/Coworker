import { useCallback } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { teamLinks, useLoading } from "~/modules/team-core/service.ts";
import { PageSection } from "~/modules/ui/service.ts";
import type { BuildApi, GitHubSources, ManagerInfo } from "../types.ts";
import { DataTable } from "./DataTable.tsx";
import { Fetch } from "./Fetch.tsx";
import { GitHubLost } from "./GitHubLost.tsx";

interface Row {
  readonly id: "email" | "github" | "chat";
  readonly kind: string;
  readonly where: string;
  readonly hears: string;
  readonly status: { readonly label: string; readonly variant: "success" | "neutral" | "error" };
}

type Role = "owner" | "builder" | "member";

function githubRow(github: GitHubSources | undefined): Row {
  const repos = github?.listening ?? [];
  const base = { id: "github", kind: "GitHub" } as const;
  if (github?.account !== undefined) {
    return {
      ...base,
      where: github.account,
      hears:
        repos.length === 0
          ? "No repo yet"
          : repos.map(({ repo, events }) => `${repo} (${events.length} ${events.length === 1 ? "event" : "events"})`).join(", "),
      status: repos.length === 0 ? { label: "Nothing chosen", variant: "neutral" } : { label: "Live", variant: "success" },
    };
  }
  if (github?.lost !== undefined)
    return {
      ...base,
      where: github.lost.account,
      hears: "Nothing: the App was uninstalled",
      status: { label: "Lost connection", variant: "error" },
    };
  return { ...base, where: "No account yet", hears: "No repo yet", status: { label: "Not connected", variant: "neutral" } };
}

function rowsOf(manager: ManagerInfo, github: GitHubSources | undefined): readonly Row[] {
  return [
    {
      id: "email",
      kind: "Email",
      where: manager.address,
      hears: "Every mail, plus replies to any task's address",
      status: { label: "Live", variant: "success" },
    },
    githubRow(github),
    {
      id: "chat",
      kind: "Chat",
      where: "This manager's chat and board",
      hears: "Always on. Always explicit.",
      status: { label: "Built in", variant: "neutral" },
    },
  ];
}

function Catalog({
  github,
  managerId,
  workspaceId,
}: {
  readonly github: GitHubSources | undefined;
  readonly managerId: string;
  readonly workspaceId: string;
}) {
  const connected = github?.account !== undefined;
  const lost = github?.lost !== undefined;
  return (
    <PageSection title="What a manager can listen to">
      <Grid columns={{ minWidth: 240, max: 3 }} gap={3}>
        <Card padding={4}>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Heading level={3}>Email</Heading>
              <Badge variant="success" label="Built in" />
            </HStack>
            <Text color="secondary">Every manager has its own address. One more address per task, for replies.</Text>
            <HStack>
              <Button label="Open email" href={teamLinks.managerSettings(workspaceId, managerId, "sources", "email")} />
            </HStack>
          </VStack>
        </Card>
        <Card padding={4}>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Heading level={3}>GitHub</Heading>
              <Badge
                variant={connected ? "success" : lost ? "error" : "neutral"}
                label={connected ? "Connected" : lost ? "Lost connection" : "Not connected"}
              />
            </HStack>
            <Text color="secondary">Issues, pull requests and reviews of the repos you choose. Replies go out as comments.</Text>
            <HStack>
              <Button label="Open GitHub" href={teamLinks.managerSettings(workspaceId, managerId, "sources", "github")} />
            </HStack>
          </VStack>
        </Card>
        <Card padding={4}>
          <VStack gap={2}>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Heading level={3}>Slack</Heading>
              <Badge variant="warning" label="Not available yet" />
            </HStack>
            <Text color="secondary">Chat platforms come later. Nothing to set up for them today.</Text>
          </VStack>
        </Card>
      </Grid>
    </PageSection>
  );
}

/** Where this manager listens, and what else it could. Each source opens its own page; a source that lost its connection says so first. */
export function Sources({
  api,
  workspaceId,
  managerId,
  role,
}: {
  readonly api: BuildApi;
  readonly workspaceId: string;
  readonly managerId: string;
  readonly role: Role;
}) {
  const manager = useLoading(useCallback(() => api.manager(workspaceId, managerId), [api, workspaceId, managerId]));
  const github = useLoading(useCallback(() => api.github(workspaceId, managerId), [api, workspaceId, managerId]));
  const install = useLoading(useCallback(() => api.installUrl(workspaceId, managerId), [api, workspaceId, managerId]));
  const detail = github.loaded?._tag === "Loaded" ? github.loaded.value : undefined;
  const url = install.loaded?._tag === "Loaded" ? install.loaded.value.url : undefined;
  return (
    <Fetch loading={manager} failedTitle="The sources did not load">
      {(info) => (
        <VStack gap={8}>
          {detail?.lost !== undefined && <GitHubLost lost={detail.lost} role={role} url={url} />}
          <PageSection title="Where this manager listens">
            <DataTable
              items={rowsOf(info, detail)}
              idOf={({ id }) => id}
              empty="Nothing yet"
              columns={[
                { header: "Kind", width: 110, cell: ({ kind }) => <Text weight="medium">{kind}</Text> },
                { header: "Where", cell: ({ where }) => <Text>{where}</Text> },
                { header: "What it hears", cell: ({ hears }) => <Text color="secondary">{hears}</Text> },
                { header: "Status", width: 160, cell: ({ status }) => <Badge variant={status.variant} label={status.label} /> },
                {
                  header: "",
                  width: 90,
                  align: "end",
                  cell: ({ id, kind }) =>
                    id === "chat" ? null : (
                      <Button
                        label="Open"
                        size="sm"
                        variant="ghost"
                        aria-label={`Open ${kind}`}
                        href={teamLinks.managerSettings(workspaceId, managerId, "sources", id)}
                      />
                    ),
                },
              ]}
            />
          </PageSection>
          <Catalog github={detail} managerId={managerId} workspaceId={workspaceId} />
        </VStack>
      )}
    </Fetch>
  );
}

import { useCallback } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/Layout";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { teamLinks, useLoading } from "~/modules/team-core/service.ts";
import type { ManagerSection } from "~/modules/team-core/types.ts";
import { Page } from "~/modules/ui/service.ts";
import { BoardSettings } from "./BoardSettings.tsx";
import { EmailSource } from "./EmailSource.tsx";
import { GitHubSource } from "./GitHubSource.tsx";
import { Permissions } from "./Permissions.tsx";
import { Sources } from "./Sources.tsx";
import { useBuildApi, useGeneral } from "./use-api.ts";
import { WhoMayAsk } from "./WhoMayAsk.tsx";
import { BUILDERS_ONLY } from "./words.ts";

const SECTIONS: readonly { readonly section: ManagerSection; readonly label: string }[] = [
  { section: "sources", label: "Sources" },
  { section: "who-may-ask", label: "Who may ask" },
  { section: "permissions", label: "Permissions" },
  { section: "board", label: "Board" },
];
export const isSection = (value: string): value is ManagerSection => SECTIONS.some((one) => one.section === value);

/** One manager's settings: where it listens, who may ask, what it may do and how its board is made. */
export function ManagerSettings({
  workspaceId,
  managerId,
  section,
  source,
}: {
  readonly workspaceId: string;
  readonly managerId: string;
  readonly section: string;
  readonly source?: string | undefined;
}) {
  const api = useBuildApi();
  const general = useGeneral(api, workspaceId);
  const manager = useLoading(useCallback(() => api.manager(workspaceId, managerId), [api, workspaceId, managerId]));
  const role = general.loaded?._tag === "Loaded" ? general.loaded.value.role : "member";
  const canEdit = role !== "member";
  const name = manager.loaded?._tag === "Loaded" ? manager.loaded.value.name : "";
  const open = isSection(section) ? section : undefined;
  const detail = open === "sources" && (source === "github" || source === "email") ? source : undefined;
  return (
    <Page
      width="wide"
      title="Settings"
      description="How this manager listens, who it works for and what it may do on its own."
      trail={
        <Breadcrumbs variant="supporting">
          <BreadcrumbItem href={teamLinks.board(workspaceId, managerId)}>{name === "" ? "Manager" : name}</BreadcrumbItem>
          {detail === undefined ? (
            <BreadcrumbItem isCurrent>Settings</BreadcrumbItem>
          ) : (
            <>
              <BreadcrumbItem href={teamLinks.managerSettings(workspaceId, managerId, "sources")}>Settings</BreadcrumbItem>
              <BreadcrumbItem isCurrent>{detail === "github" ? "GitHub" : "Email"}</BreadcrumbItem>
            </>
          )}
        </Breadcrumbs>
      }
    >
      <VStack gap={6}>
        <TabList value={open ?? ""} onChange={() => undefined} hasDivider overflow="scroll">
          {SECTIONS.map(({ section: value, label }) => (
            <Tab key={value} value={value} label={label} href={teamLinks.managerSettings(workspaceId, managerId, value)} />
          ))}
        </TabList>
        {general.loaded?._tag === "Failed" && <Banner status="error" title="Your role did not load" description={general.loaded.message} />}
        {!canEdit && general.loaded?._tag === "Loaded" && <Banner status="info" title={BUILDERS_ONLY} />}
        {open === undefined && <EmptyState title="No such settings page" headingLevel={2} />}
        {open === "sources" && detail === undefined && <Sources api={api} workspaceId={workspaceId} managerId={managerId} role={role} />}
        {detail === "github" && <GitHubSource api={api} workspaceId={workspaceId} managerId={managerId} role={role} />}
        {detail === "email" && <EmailSource api={api} workspaceId={workspaceId} managerId={managerId} canTest={canEdit} />}
        {open === "who-may-ask" && <WhoMayAsk api={api} workspaceId={workspaceId} managerId={managerId} canEdit={canEdit} />}
        {open === "permissions" && <Permissions api={api} workspaceId={workspaceId} managerId={managerId} canEdit={canEdit} />}
        {open === "board" && <BoardSettings api={api} workspaceId={workspaceId} managerId={managerId} canEdit={canEdit} />}
      </VStack>
    </Page>
  );
}

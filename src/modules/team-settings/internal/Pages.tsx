import { useCallback, useRef } from "react";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Load, useLoading } from "~/modules/team-core/service.ts";
import type { ScreenProps, SettingsPagesProps } from "../types.ts";
import { AuditPage } from "./AuditPage.tsx";
import { GeneralPage } from "./GeneralPage.tsx";
import { KeysPage } from "./KeysPage.tsx";
import { MembersPage } from "./MembersPage.tsx";
import { NotificationsPage, ProfilePage } from "./PersonalPages.tsx";
import { RolesPage } from "./RolesPage.tsx";
import { SecurityPage } from "./SecurityPage.tsx";
import { UnsavedProvider } from "./Unsaved.tsx";
import { BillingPage, UsagePage } from "./UsagePages.tsx";
import { useSettingsApi } from "./use-settings-api.ts";

function OwnerPage({ api, workspaceId, page, onGone }: ScreenProps & { readonly page: string; readonly onGone: () => void }) {
  switch (page) {
    case "general":
      return <GeneralPage api={api} workspaceId={workspaceId} onGone={onGone} />;
    case "members":
      return <MembersPage api={api} workspaceId={workspaceId} />;
    case "roles":
      return <RolesPage api={api} workspaceId={workspaceId} />;
    case "keys":
      return <KeysPage api={api} workspaceId={workspaceId} />;
    case "usage":
      return <UsagePage api={api} workspaceId={workspaceId} />;
    case "billing":
      return <BillingPage api={api} workspaceId={workspaceId} />;
    case "security":
      return <SecurityPage api={api} workspaceId={workspaceId} />;
    case "audit":
      return <AuditPage api={api} workspaceId={workspaceId} />;
    default:
      return <EmptyState title="No such settings page" headingLevel={1} />;
  }
}

function Owners({ api, workspaceId, page, onGone }: ScreenProps & { readonly page: string; readonly onGone: () => void }) {
  const { loaded, reload } = useLoading(useCallback(() => api.workspace(workspaceId), [api, workspaceId]));
  return (
    <Load loaded={loaded} failedTitle="The workspace did not load" onRetry={reload}>
      {({ role }) =>
        role === "owner" ? (
          <OwnerPage api={api} workspaceId={workspaceId} page={page} onGone={onGone} />
        ) : (
          <EmptyState title="Only Owners open this page" description="Ask an Owner of the workspace." headingLevel={1} />
        )
      }
    </Load>
  );
}

/** The settings screen an address names. Profile and notifications are everyone's; the rest are for Owners. Each tells the page when it holds changes nobody saved. */
export function SettingsPages({ workspaceId, page, onGone, onDirty }: SettingsPagesProps) {
  const api = useSettingsApi();
  const dirty = useRef(new Set<string>());
  const report = useCallback(
    (owner: string, isDirty: boolean) => {
      if (isDirty) dirty.current.add(owner);
      else dirty.current.delete(owner);
      onDirty?.(dirty.current.size > 0);
    },
    [onDirty],
  );
  return (
    <UnsavedProvider value={report}>
      {page === "profile" ? (
        <ProfilePage api={api} workspaceId={workspaceId} />
      ) : page === "notifications" ? (
        <NotificationsPage api={api} workspaceId={workspaceId} />
      ) : (
        <Owners api={api} workspaceId={workspaceId} page={page} onGone={onGone} />
      )}
    </UnsavedProvider>
  );
}

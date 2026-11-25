import { useSelector } from "@tanstack/react-store";
import { useToast } from "@astryxdesign/core/Toast";
import { Library, Page, PageSection, ScheduleList, SettingsForm, UsageReport } from "~/modules/ui/service.ts";
import type { WorkspaceClient } from "~/modules/manager-client/types.ts";
import type { SettingsScreenProps } from "../types.ts";
import { Gone } from "./Gone.tsx";
import { useDirectory, useReport, useWorkspace } from "./hooks.ts";
import { links } from "./links.ts";
import { useSession } from "./page-context.ts";

export function LibraryScreen() {
  const { directory } = useSession();
  const { workspaces } = useDirectory();
  const report = useReport();
  return (
    <Library
      workspaces={workspaces}
      links={links}
      onRestoreWorkspace={(id) => void report(directory.updateWorkspace(id, { archived: false }))}
      onRestoreChat={(id, chatId) => void report(directory.updateChat(id, chatId, { archived: false }))}
    />
  );
}

function WorkspaceSettings({ client }: { readonly client: WorkspaceClient }) {
  const { models, workspaces } = useDirectory();
  const workspace = useSelector(client.state, (state) => state.workspace);
  const report = useReport();
  const showToast = useToast();
  if (workspace === undefined) return null;
  const { settings, usage, schedules } = workspace;
  const chats = workspaces.find(({ id }) => id === client.id)?.chats ?? [];
  const save = async (change: Parameters<WorkspaceClient["updateSettings"]>[0]) => {
    const answer = await client.updateSettings(change);
    if (answer.ok) showToast({ body: "Saved for everyone", uniqueID: "settings" });
    else void report(Promise.resolve(answer));
  };
  return (
    <Page title={`${workspace.name} settings`} description="Shared by everyone who uses this workspace.">
      <PageSection title="Assistant">
        <SettingsForm key={JSON.stringify(settings)} settings={settings} models={models} onSave={(change) => void save(change)} />
      </PageSection>
      <PageSection title="Usage">
        <UsageReport usage={usage} {...(settings.budgetUsd === undefined ? {} : { budgetUsd: settings.budgetUsd })} />
      </PageSection>
      <PageSection title="Scheduled">
        <ScheduleList
          schedules={schedules}
          chatTitle={(chatId) => chats.find(({ id }) => id === chatId)?.title ?? "Chat"}
          chatHref={(chatId) => links.chat(client.id, chatId)}
          onCancel={(taskId) => void report(client.cancelTask(taskId))}
        />
      </PageSection>
    </Page>
  );
}

export function SettingsScreen({ workspaceId }: SettingsScreenProps) {
  const { loaded, workspaces } = useDirectory();
  const client = useWorkspace(workspaceId);
  if (loaded && workspaces.every(({ id }) => id !== workspaceId)) return <Gone kind="workspace" workspaceId={undefined} />;
  return client === undefined ? null : <WorkspaceSettings client={client} />;
}

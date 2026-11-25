import { useCallback, useState } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { mayOpen } from "~/modules/access/service.ts";
import type { Standing } from "~/modules/access/types.ts";
import { Load, teamLinks, useLoading, Waiting } from "~/modules/team-core/service.ts";
import type { NavData, NewManager, TeamShellProps } from "../types.ts";
import { AppNav } from "./AppNav.tsx";
import { NewManagerDialog } from "./NewManagerDialog.tsx";
import { NoAccess } from "./NoAccess.tsx";
import { pageOf } from "./page.ts";
import { placeOf } from "./place.ts";
import { useOwn } from "./use-own.ts";
import { Search } from "./Search.tsx";
import { SettingsNav } from "./SettingsNav.tsx";
import { useSearchShortcut } from "./use-search-shortcut.ts";

/** How often the sidebar asks for new managers and what waits. */
const REFRESH_MS = 5_000;

const NO_CHANGES = { categories: {}, actions: {} } as const;

const NotHere = () => (
  <Center minHeight="100dvh">
    <EmptyState
      title="No such workspace"
      description="You are not a member of it, or it was deleted."
      headingLevel={1}
      actions={<Button label="Your workspaces" href={teamLinks.home} />}
    />
  </Center>
);

/** The sidebar and what it opens, around every screen of one workspace. */
export function TeamShell({ api, workspaceId, path, me, onSignOut, onGo, gettingStarted, listenKeys, children }: TeamShellProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  useSearchShortcut(
    listenKeys,
    useCallback(() => setIsSearching(true), []),
  );
  const { loaded: workspaces } = useLoading(api.workspaces, REFRESH_MS);
  const managers = useLoading(
    useCallback(() => api.managers(workspaceId), [api, workspaceId]),
    REFRESH_MS,
  );
  const { loaded: waiting } = useLoading(
    useCallback(() => api.waiting(workspaceId), [api, workspaceId]),
    REFRESH_MS,
  );
  const access = useOwn(api, workspaceId);
  // The first answer to what the person may do decides the sidebar: shown before it, it would offer links they cannot open.
  if (workspaces === undefined || access.loaded === undefined) return <Waiting />;
  if (workspaces._tag === "Failed")
    return (
      <Load loaded={workspaces} failedTitle="Your workspaces did not load">
        {() => null}
      </Load>
    );
  const workspace = workspaces.value.find((choice) => choice.workspaceId === workspaceId);
  if (workspace === undefined) return <NotHere />;

  const place = placeOf(path);
  const standing: Standing = { role: workspace.role, own: access.own ?? NO_CHANGES };
  const page = pageOf(path);
  const nav: NavData = {
    standing,
    workspace,
    workspaces: workspaces.value,
    managers: managers.loaded?._tag === "Loaded" ? managers.loaded.value : [],
    waiting: waiting?._tag === "Loaded" ? waiting.value : 0,
    me,
  };
  const create = async (input: NewManager) => {
    const made = await api.createManager(workspaceId, input);
    if (made._tag === "Loaded") {
      setIsCreating(false);
      managers.reload();
      onGo(teamLinks.chat(workspaceId, made.value.managerId));
    }
    return made;
  };
  return (
    <AppShell
      contentPadding={0}
      sideNav={
        place.kind === "settings" ? (
          <SettingsNav nav={nav} place={place} />
        ) : (
          <AppNav
            nav={nav}
            place={place}
            onSignOut={onSignOut}
            onSearch={() => setIsSearching(true)}
            onNewManager={() => setIsCreating(true)}
            extra={workspace.role === "owner" ? gettingStarted : undefined}
          />
        )
      }
    >
      {access.own === undefined ? (
        <Load loaded={access.loaded} failedTitle="Your access did not load">
          {() => null}
        </Load>
      ) : page !== undefined && !mayOpen(standing, page) ? (
        <NoAccess workspaceId={workspaceId} isOwnersOnly={page === "workspace"} />
      ) : (
        children
      )}
      <Search api={api} workspaceId={workspaceId} managers={nav.managers} isOpen={isSearching} onOpenChange={setIsSearching} onGo={onGo} />
      <NewManagerDialog isOpen={isCreating} onClose={() => setIsCreating(false)} onCreate={create} />
    </AppShell>
  );
}

import { type ReactNode, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { SearchPalette, WorkspaceNav } from "~/modules/ui/service.ts";
import type { Selected } from "~/modules/ui/types.ts";
import { useDirectory, useReport, useWorkspaceState } from "./hooks.ts";
import { links } from "./links.ts";
import { useRowHandlers } from "./row-handlers.ts";
import { useSearch } from "./search.ts";
import { usePage, useSession } from "./page-context.ts";

/** What everyone on the page should know: the page is too old, the server is away, or no model can answer. */
function StatusBanner() {
  const { session, dependencies } = usePage();
  const { status, loaded, models } = useDirectory();
  const workspace = useSelector(session.workspaces.current);
  const workspaceStatus = useWorkspaceState(workspace, (state) => state.status);
  if (status === "outdated" || workspaceStatus === "outdated") {
    return (
      <Banner
        status="warning"
        container="section"
        title="The app was updated"
        endContent={<Button label="Reload" size="sm" onClick={dependencies.reload} />}
      />
    );
  }
  if (loaded && (status === "connecting" || workspaceStatus === "connecting")) {
    return <Banner status="info" container="section" title="Reconnecting… What you send is kept until then." />;
  }
  if (loaded && models.length === 0) {
    return (
      <Banner
        status="error"
        container="section"
        title="No model can answer yet"
        description="Give the server a provider key or a proxy address. The README says how."
      />
    );
  }
  return null;
}

function Navigation({ selected, onSearch }: { readonly selected: Selected; readonly onSearch: () => void }) {
  const session = useSession();
  const { workspaces, people, me, isAdmin } = useDirectory();
  const report = useReport();
  const router = useRouter();
  const handlers = useRowHandlers(selected);
  const open = async (asking: Promise<string | undefined>) => {
    const address = await asking;
    if (address !== undefined) router.history.push(address);
  };
  const createWorkspace = async (name: string) => {
    const id = await report(session.directory.createWorkspace(name));
    return id === undefined ? undefined : links.workspace(id);
  };
  return (
    <>
      <WorkspaceNav
        workspaces={workspaces}
        me={me ?? session.me}
        people={people}
        selected={selected}
        links={links}
        onSearch={onSearch}
        onNewWorkspace={(name) => void open(createWorkspace(name))}
        onNewChat={(workspaceId) => router.history.push(links.workspace(workspaceId))}
        {...(isAdmin ? { adminHref: links.admin } : {})}
        {...handlers}
      />
    </>
  );
}

/** The frame around every screen, whoever it is for. */
export function Frame({ sideNav, children }: { readonly sideNav: ReactNode; readonly children: ReactNode }) {
  return (
    <AppShell contentPadding={0} banner={<StatusBanner />} sideNav={sideNav}>
      {children}
    </AppShell>
  );
}

/** Around the screens everyone sees. */
export function Shell({ selected, children }: { readonly selected: Selected; readonly children: ReactNode }) {
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  return (
    <Frame sideNav={<Navigation selected={selected} onSearch={() => setIsSearching(true)} />}>
      {children}
      <SearchPalette
        isOpen={isSearching}
        onOpenChange={setIsSearching}
        {...useSearch()}
        onPick={(address) => router.history.push(address)}
      />
    </Frame>
  );
}

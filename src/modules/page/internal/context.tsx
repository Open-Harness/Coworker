import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { LinkProvider } from "@astryxdesign/core/Link";
import { createApi, createOutside } from "~/modules/api/service.ts";
import type { Api, Reads } from "~/modules/api/types.ts";
import type { Browser, Clock, Go, Outside, Params, Read } from "../types.ts";
import { createClock } from "./format.ts";
import { RouterLink } from "./RouterLink.tsx";
import { addressOf } from "./match.ts";
import { createReads, type Reads_ } from "./store.ts";

interface Page {
  readonly browser: Browser;
  readonly reads: Reads_;
}
const PageContext = createContext<Page | undefined>(undefined);
export const WorkspaceContext = createContext<string | null>(null);

function usePage(): Page {
  const page = useContext(PageContext);
  if (page === undefined) throw new Error("No PageProvider above this screen");
  return page;
}

/** The browser's side of every screen: its links, its layers, and what has been read from the console. */
export function PageProvider({ browser, children }: { readonly browser: Browser; readonly children: ReactNode }) {
  const page = useMemo(() => ({ browser, reads: createReads(browser.fetch) }), [browser]);
  return (
    <PageContext.Provider value={page}>
      <LinkProvider component={RouterLink}>
        <LayerProvider>{children}</LayerProvider>
      </LinkProvider>
    </PageContext.Provider>
  );
}

export const useBrowser = (): Browser => usePage().browser;
export const useReads = (): Reads_ => usePage().reads;

/** The address of the workspace this screen is in. */
export function useWorkspace(): string {
  const workspace = useContext(WorkspaceContext);
  if (workspace === null) throw new Error("This screen is not in a workspace");
  return workspace;
}

export function useApi(): Api {
  const { browser } = usePage();
  const workspace = useWorkspace();
  return useMemo(() => createApi({ fetch: browser.fetch, workspace }), [browser, workspace]);
}

export function useOutside(): Outside {
  const { browser } = usePage();
  return useMemo(() => createOutside(browser.fetch), [browser]);
}

/** A read of the console, shared by every screen that asks for the same one, and asked again when it changes. */
export function useRead<P extends keyof Reads>(path: P, parts?: Params): Read<Reads[P]> {
  const { reads } = usePage();
  const workspace = useWorkspace();
  const key = `${path}|${JSON.stringify(parts ?? {})}`;
  const subscribe = useCallback((listener: () => void) => reads.watch(workspace, path, parts, listener), [reads, workspace, key]); // oxlint-disable-line react-hooks/exhaustive-deps
  const peek = useCallback(() => reads.peek(workspace, path, parts), [reads, workspace, key]); // oxlint-disable-line react-hooks/exhaustive-deps
  // What a read holds is typed by the console's map: `path` says what it is.
  return useSyncExternalStore(subscribe, peek) as Read<Reads[P]>;
}

export function useGo(): Go {
  const router = useRouter();
  const workspace = useContext(WorkspaceContext);
  return useCallback(
    (to, options) => {
      const address = addressOf(workspace, to);
      if (options?.replace === true) router.history.replace(address);
      else router.history.push(address);
    },
    [router, workspace],
  );
}

/** Where a path of the workspace is, for a link. */
export function useHref(): (to: string) => string {
  const workspace = useContext(WorkspaceContext);
  return useCallback((to) => addressOf(workspace, to), [workspace]);
}

export function useClock(): Clock {
  const { browser } = usePage();
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return useMemo(() => createClock(browser.now, zone), [browser, zone]);
}

export function useOnline(): boolean {
  const { online } = useBrowser();
  return useSyncExternalStore(online.subscribe, online.now);
}

/** Asks again what a change touched: the paths with their parts filled in, or everything of this workspace. */
export function useRefresh(): (paths?: readonly string[]) => void {
  const { reads } = usePage();
  const workspace = useWorkspace();
  return useCallback((paths) => reads.refresh(workspace, paths), [reads, workspace]);
}

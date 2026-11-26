import { lazy, Suspense, useEffect, useMemo, type ComponentType, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@astryxdesign/core/Button";
import type { Here, PageProps, Params, ScreenRoute } from "../types.ts";
import { useBrowser, useReads, WorkspaceContext } from "./context.tsx";
import { entriesOf, locate, resolve, type Entry } from "./match.ts";
import { Missing, Waiting } from "./states.tsx";

type Loader = () => Promise<{ readonly default: ComponentType<PageProps> }>;

export interface ScreensProps {
  /** The `route.ts` of every folder in `src/screens`, as `import.meta.glob` finds them. */
  readonly routes: Readonly<Record<string, ScreenRoute | readonly ScreenRoute[]>>;
  /** The `index.tsx` of every folder, loaded when its page is first wanted. */
  readonly pages: Readonly<Record<string, Loader>>;
  /** The frame around every page of a workspace. */
  readonly shell: ComponentType<{ readonly here: Here; readonly children: ReactNode }>;
}

const search = (text: string): Params => Object.fromEntries(new URLSearchParams(text));

/** Which page the address is, in its frame; and the workspace's live socket, which asks again what changed. */
export function Screens({ routes, pages, shell: Shell }: ScreensProps) {
  const { pathname, searchStr } = useRouterState({ select: (state) => state.location });
  const entries = useMemo(() => entriesOf(routes), [routes]);
  const loaded = useMemo(() => new Map<string, ComponentType<PageProps>>(), []);
  const where = locate(pathname);
  const found = resolve(entries, where);

  const lazyPage = (entry: Entry): ComponentType<PageProps> | undefined => {
    const key = Object.keys(pages).find((file) => file.endsWith(`/screens/${entry.folder}/index.tsx`));
    const load = key === undefined ? undefined : pages[key];
    if (load === undefined) return undefined;
    const made = loaded.get(entry.folder) ?? lazy(load);
    loaded.set(entry.folder, made);
    return made;
  };

  const Page = found === undefined ? undefined : lazyPage(found.entry);
  const body =
    found === undefined || Page === undefined ? (
      <Missing
        title="This page is not here"
        description="The address is wrong, or the page has not been made yet."
        actions={<Button label="Go home" href={where.workspace === null ? "/" : `/ws/${where.workspace}`} />}
      />
    ) : (
      <Suspense fallback={<Waiting />}>
        <Page params={found.params} search={search(searchStr)} />
      </Suspense>
    );
  if (where.workspace === null) return body;
  return (
    <WorkspaceContext.Provider value={where.workspace}>
      <Live workspace={where.workspace} />
      <Shell here={{ path: where.rest, route: found?.entry.route, params: found?.params ?? {} }}>{body}</Shell>
    </WorkspaceContext.Provider>
  );
}

/** What the server says changed is read again; it says so as paths with their parts in. */
function Live({ workspace }: { readonly workspace: string }) {
  const { live, online } = useBrowser();
  const reads = useReads();
  useEffect(
    () => live(`/api/ws/${encodeURIComponent(workspace)}/live`, (changed) => reads.refresh(workspace, changed)),
    [live, reads, workspace],
  );
  // What failed while there was no connection is asked again when it comes back.
  useEffect(() => online.subscribe(() => online.now() && reads.refresh(workspace)), [online, reads, workspace]);
  return null;
}

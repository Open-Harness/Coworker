import { useCallback, useRef } from "react";
import type { PermissionSet } from "~/modules/actions/types.ts";
import { useLoading } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { ShellApi } from "../types.ts";

/** How often what an Owner changed for the person is asked again, so that a change shows without a reload. */
const REFRESH_MS = 5_000;

/**
 * What the person's own changes are. The last answer stays while a later one fails, so that one dropped request does not
 * take the page out from under them; the first one failing is reported as `loaded`.
 */
export function useOwn(
  api: ShellApi,
  workspaceId: string,
): { readonly own: PermissionSet | undefined; readonly loaded: Loaded<PermissionSet> | undefined } {
  const { loaded } = useLoading(
    useCallback(() => api.own(workspaceId), [api, workspaceId]),
    REFRESH_MS,
  );
  const last = useRef<{ readonly workspaceId: string; readonly own: PermissionSet }>(undefined);
  if (loaded?._tag === "Loaded") last.current = { workspaceId, own: loaded.value };
  return { own: last.current?.workspaceId === workspaceId ? last.current.own : undefined, loaded };
}

import { useCallback, useEffect } from "react";
import { SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { ArrowRightCircleIcon } from "@heroicons/react/24/outline";
import { useLoading } from "~/modules/team-core/service.ts";
import type { GettingStartedProps } from "../types.ts";

const REFRESH_MS = 15_000;

/** What setting up left to do, in the sidebar until all of it is done. */
export function GettingStarted({ api, workspaceId, path }: GettingStartedProps) {
  const { loaded, reload } = useLoading(
    useCallback(() => api.progress(workspaceId), [api, workspaceId]),
    REFRESH_MS,
  );
  useEffect(reload, [reload, path]);
  if (loaded?._tag !== "Loaded") return null;
  const tasks = loaded.value;
  const left = tasks.filter(({ isDone }) => !isDone);
  if (left.length === 0) return null;
  return (
    <SideNavSection title={`Getting started · ${tasks.length - left.length} of ${tasks.length}`}>
      {left.map(({ key, label, href }) => (
        <SideNavItem key={key} label={label} icon={ArrowRightCircleIcon} href={href} />
      ))}
    </SideNavSection>
  );
}

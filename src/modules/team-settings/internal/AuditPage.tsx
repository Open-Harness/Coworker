import { useCallback, useEffect, useState } from "react";
import { useBrowser, useLoading, Waiting } from "~/modules/team-core/service.ts";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { AuditControls, AuditData, AuditPage as Page, ScreenProps } from "../types.ts";
import { filtersOf, NO_FILTERS } from "./audit-filters.ts";
import { AuditScreen } from "./AuditScreen.tsx";

/** What was asked under one set of filters: the newest page, then older ones as they are asked for. */
interface Lines {
  readonly key: string;
  readonly first: Loaded<Page>;
  readonly older: readonly AuditData[];
  readonly next: string | undefined;
}

export function AuditPage({ api, workspaceId }: ScreenProps) {
  const { goTo } = useBrowser();
  const [controls, setControls] = useState<AuditControls>(NO_FILTERS);
  const [lines, setLines] = useState<Lines>();
  const [tries, setTries] = useState(0);
  const [moreFailure, setMoreFailure] = useState<string>();
  const names = useLoading(useCallback(() => api.managers(workspaceId), [api, workspaceId]));
  const roles = useLoading(useCallback(() => api.roles(workspaceId), [api, workspaceId]));
  const key = JSON.stringify(controls);
  useEffect(() => {
    let isCurrent = true;
    void api.auditPage(workspaceId, filtersOf(controls, Date.now())).then((first) => {
      if (isCurrent) setLines({ key, first, older: [], next: first._tag === "Loaded" ? first.value.next : undefined });
    });
    return () => {
      isCurrent = false;
    };
  }, [api, workspaceId, controls, key, tries]);
  if (lines === undefined) return <Waiting />;
  const isLoading = lines.key !== key;
  const entries = lines.first._tag === "Loaded" ? [...lines.first.value.entries, ...lines.older] : [];
  const more = async () => {
    if (lines.next === undefined) return;
    const result = await api.auditPage(workspaceId, filtersOf(controls, Date.now()), lines.next);
    if (result._tag === "Failed") return setMoreFailure(result.message);
    setMoreFailure(undefined);
    setLines({ ...lines, older: [...lines.older, ...result.value.entries], next: result.value.next });
  };
  return (
    <AuditScreen
      entries={entries}
      isLoading={isLoading}
      failure={lines.first._tag === "Failed" && !isLoading ? lines.first.message : undefined}
      onRetry={() => setTries((count) => count + 1)}
      managers={names.loaded?._tag === "Loaded" ? names.loaded.value : {}}
      categories={roles.loaded?._tag === "Loaded" ? roles.loaded.value.categories : []}
      controls={controls}
      onControls={(next) => {
        setMoreFailure(undefined);
        setControls(next);
      }}
      hasMore={lines.next !== undefined && !isLoading}
      onMore={more}
      moreFailure={moreFailure}
      exportHref={api.auditExportUrl(workspaceId, filtersOf(controls, Date.now()))}
      onExport={goTo}
    />
  );
}

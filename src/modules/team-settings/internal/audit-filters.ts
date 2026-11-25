import type { AuditControls, AuditFilters } from "../types.ts";

export const NO_FILTERS: AuditControls = { kind: "all", manager: "all", category: "all", permission: "any", outcome: "all", range: "all" };

const DAY = 24 * 60 * 60 * 1000;
export const RANGES: Readonly<Record<AuditControls["range"], { readonly label: string; readonly ms: number | undefined }>> = {
  all: { label: "Any time", ms: undefined },
  "1d": { label: "Last 24 hours", ms: DAY },
  "7d": { label: "Last 7 days", ms: 7 * DAY },
  "30d": { label: "Last 30 days", ms: 30 * DAY },
};

/** The server's filters for what the bar shows, with `now` for how far back "last 7 days" goes. */
export function filtersOf(controls: AuditControls, now: number): AuditFilters {
  const span = RANGES[controls.range].ms;
  return {
    ...(controls.kind === "all" ? {} : { kind: controls.kind }),
    ...(controls.manager === "all" ? {} : { manager: controls.manager === "workspace" ? "" : controls.manager }),
    ...(controls.category === "all" ? {} : { category: controls.category }),
    ...(controls.permission === "any" ? {} : { permission: controls.permission }),
    ...(controls.outcome === "all" ? {} : { outcome: controls.outcome }),
    ...(span === undefined ? {} : { since: now - span }),
  };
}

import { useMemo } from "react";
import { PowerSearch, usePowerSearchConfig } from "@astryxdesign/core/PowerSearch";
import type { AuditControls } from "../types.ts";
import { controlsOf, fieldDefinitions, onlyIs, searchOf } from "./audit-search.ts";

/** The audit log's filters, as Astryx's `table-filter` has them: a PowerSearch of who, outcome, where, category, permission and when. Each change asks the server again. */
export function AuditFilterBar({
  controls,
  onControls,
  managers,
  categories,
}: {
  readonly controls: AuditControls;
  readonly onControls: (next: AuditControls) => void;
  readonly managers: Readonly<Record<string, string>>;
  readonly categories: readonly string[];
}) {
  const definitions = useMemo(() => fieldDefinitions(managers, categories), [managers, categories]);
  const { config } = usePowerSearchConfig(definitions, "Audit log");
  const single = useMemo(() => onlyIs(config), [config]);
  return (
    <PowerSearch
      config={single}
      filters={searchOf(controls)}
      onChange={(filters) => onControls(controlsOf(filters))}
      label="Filter the audit log"
      placeholder="Filter by who, outcome, where, category, permission or when"
    />
  );
}

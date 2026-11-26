import type { AuditView } from "~/modules/views-workspace/types.ts";
import type { AuditRow, ConsoleDeps } from "../types.ts";

const LIMIT = 50;

const lineOf = (row: AuditRow): AuditView["lines"][number] => ({
  id: row.id,
  at: row.at,
  by: row.by,
  coworker: row.kind === "coworker",
  kind: row.kind,
  says: row.says,
  permission: row.permission,
  under: { is: "role", says: `${row.by} is ${row.role === "Owner" ? "an" : "a"} ${row.role}` },
  approvedBy: null,
  outcome: row.outcome,
  why: row.why,
  group: row.group,
});

export async function auditView(c: ConsoleDeps, query: URLSearchParams): Promise<AuditView> {
  const found = await c.store.auditLines({
    by: query.get("by") || null,
    outcome: query.get("outcome") || null,
    before: query.get("before") || null,
    limit: LIMIT,
  });
  return { lines: found.lines.map(lineOf), next: found.next };
}

import type { SignedIn } from "~/modules/auth/types.ts";
import { auditCsv } from "~/modules/settings/service.ts";
import type { AuditQuery } from "~/modules/actions/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { fresh, problem, reach, settings } from "./kit.ts";

/**
 * `GET audit` with filters (who, manager, category, permission, outcome, since, until) in pages, and `GET audit/export`
 * as CSV. Owners only; reading the log is not an action in the log, but taking it away is.
 */

const MAX_EXPORT = 10_000;

/** The filters a request names. One that is not understood is left out, so a typo never widens what is exported. */
export function auditQueryOf(params: URLSearchParams): AuditQuery | undefined {
  const number = (key: string): number | undefined | null => {
    const value = params.get(key);
    if (value === null) return undefined;
    return /^\d{1,15}$/u.test(value) ? Number(value) : null;
  };
  const [since, until, limit] = [number("since"), number("until"), number("limit")];
  const permission = params.get("permission");
  const kind = params.get("kind");
  const outcome = params.get("outcome");
  if (since === null || until === null || limit === null) return undefined;
  if (permission !== null && permission !== "on" && permission !== "ask" && permission !== "off") return undefined;
  if (kind !== null && kind !== "person" && kind !== "manager") return undefined;
  if (outcome !== null && !["done", "refused", "asked", "failed"].includes(outcome)) return undefined;
  return {
    ...(params.has("by") ? { by: params.get("by") ?? "" } : {}),
    ...(kind === null ? {} : { kind }),
    ...(params.has("manager") ? { manager: params.get("manager") ?? "" } : {}),
    ...(params.has("category") ? { category: params.get("category") ?? "" } : {}),
    ...(permission === null ? {} : { permission }),
    ...(outcome === null ? {} : { outcome: outcome as NonNullable<AuditQuery["outcome"]> }),
    ...(since === undefined ? {} : { since }),
    ...(until === undefined ? {} : { until }),
    ...(params.has("before") ? { before: params.get("before") ?? "" } : {}),
    ...(limit === undefined ? {} : { limit }),
  };
}

export async function routeAudit(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  exporting: boolean,
): Promise<Response> {
  const reached = await reach(workspaces, person, workspaceId, "settings", "Only an Owner can read the audit log");
  if (reached instanceof Response) return reached;
  if (request.method !== "GET") return problem(405, "Use GET");
  const query = auditQueryOf(new URL(request.url).searchParams);
  if (query === undefined) return problem(400, "since and until are milliseconds; permission is on, ask or off; kind is person or manager");
  const { object } = reached;
  if (!exporting) {
    const page = await object.auditQuery(query);
    return fresh({ entries: page.entries, ...(page.next === undefined ? {} : { next: page.next }) });
  }
  const lines = [];
  for (
    let page = await object.auditQuery({ ...query, limit: 500 });
    ;
    page = await object.auditQuery({ ...query, limit: 500, before: page.next ?? "" })
  ) {
    lines.push(...page.entries);
    if (page.next === undefined || lines.length >= MAX_EXPORT) break;
  }
  const names = Object.fromEntries((await object.managers()).map(({ managerId, name }) => [managerId, name]));
  await settings(object, person, "auditExported", { lines: lines.length });
  return new Response(auditCsv(lines, names), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-log.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

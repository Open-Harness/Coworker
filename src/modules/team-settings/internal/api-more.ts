import { each, isRecord, textOf } from "~/modules/team-core/service.ts";
import type { Server } from "~/modules/team-core/types.ts";
import type { AuditFilters, MoreApi } from "../types.ts";
import { decodeAudit } from "./decode-work.ts";
import {
  decodeAgentNames,
  decodeCheck,
  decodeGeneral,
  decodeMe,
  decodeNames,
  decodePermissions,
  decodeRoles,
  decodeSecrets,
  decodeTest,
  decodeUsage,
} from "./decode-more.ts";

const done = (): true => true;
/** How many audit lines a page holds. */
const PAGE = 50;
const at = (workspaceId: string, path = ""): string => `/api/workspaces/${encodeURIComponent(workspaceId)}${path}`;

/** The filters as a query, and `before` to continue from a page's end. */
function queryOf(filters: AuditFilters, before?: string, limit?: number): string {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  for (const [name, value] of Object.entries(filters)) if (value !== undefined) params.set(name, String(value));
  if (before !== undefined) params.set("before", before);
  const text = params.toString();
  return text === "" ? "" : `?${text}`;
}

const managerNames = (body: unknown): Readonly<Record<string, string>> | undefined =>
  isRecord(body)
    ? Object.fromEntries(
        each(body["managers"], (row) =>
          typeof row["managerId"] === "string" ? ([row["managerId"], textOf(row["name"], row["managerId"])] as const) : undefined,
        ),
      )
    : undefined;

/** The routes that change one thing at a time. A deletion says what it deletes, as the server asks. */
export function createMoreApi({ read, write, upload }: Server): MoreApi {
  const confirm = (what: string) => ({ confirm: what });
  return {
    general: (id) => read(at(id, "/general"), decodeGeneral),
    saveGeneral: (id, input) => write("PUT", at(id, "/general"), input, done),
    uploadLogo: (id, file) => upload(at(id, "/logo"), file, done),
    removeLogo: (id) => write("DELETE", at(id, "/logo"), confirm("logo"), done),
    logoUrl: (id, version) => `${at(id, "/logo")}?v=${version}`,
    exportUrl: (id) => at(id, "/export"),
    roles: (id) => read(at(id, "/roles"), decodeRoles),
    permissions: (id) => read(at(id, "/permissions"), decodePermissions),
    setChange: (id, change) => write("PUT", at(id, "/permissions"), change, done),
    usage: (id) => read(at(id, "/usage"), decodeUsage),
    setBudget: (id, managerId, budget) => write("PUT", at(id, "/budgets"), { managerId, budget }, done),
    managers: (id) => read(at(id, "/managers"), managerNames),
    auditPage: (id, filters, before) => read(at(id, `/audit${queryOf(filters, before, PAGE)}`), decodeAudit),
    auditExportUrl: (id, filters) => at(id, `/audit/export${queryOf(filters)}`),
    recheckModel: (id, modelId) => write("POST", at(id, `/models/${encodeURIComponent(modelId)}/check`), undefined, decodeCheck),
    replaceKey: (id, modelId, key) => write("PUT", at(id, `/models/${encodeURIComponent(modelId)}`), { key }, decodeCheck),
    editEndpoint: (id, modelId, edit) => write("PUT", at(id, `/models/${encodeURIComponent(modelId)}`), edit, decodeCheck),
    removeModel: (id, modelId) => write("DELETE", at(id, `/models/${encodeURIComponent(modelId)}`), confirm(modelId), done),
    secrets: (id) => read(at(id, "/secrets"), decodeSecrets),
    removeSecret: (id, name) => write("DELETE", at(id, `/secrets/${encodeURIComponent(name)}`), confirm(name), decodeNames("usedBy")),
    deleteEnvironment: (id, environmentId) =>
      write("DELETE", at(id, `/environments/${encodeURIComponent(environmentId)}`), confirm(environmentId), decodeNames("agents")),
    testEnvironment: (id, environmentId) =>
      write("POST", at(id, `/environments/${encodeURIComponent(environmentId)}/test`), undefined, decodeTest),
    agentNames: (id) => read(at(id, "/agents"), decodeAgentNames),
    me: (id) => read(at(id, "/me"), decodeMe),
    saveProfile: (id, profile) => write("PUT", at(id, "/me/profile"), profile, done),
    saveNotifications: (id, { events, quietHours }) =>
      write(
        "PUT",
        at(id, "/me/notifications"),
        { email: Object.fromEntries(events.map(({ event, email }) => [event, email])), quietHours },
        done,
      ),
  };
}

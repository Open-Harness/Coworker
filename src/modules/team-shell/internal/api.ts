import type { Permission, PermissionSet } from "~/modules/actions/types.ts";
import { arrayOf, each, isRecord, textOf } from "~/modules/team-core/service.ts";
import type { Json, Server } from "~/modules/team-core/types.ts";
import type { ManagerLink, SearchResult, ShellApi, WorkspaceChoice } from "../types.ts";

const workspace = (row: Json): WorkspaceChoice | undefined => {
  if (typeof row["workspaceId"] !== "string") return undefined;
  const role = row["role"] === "owner" || row["role"] === "builder" ? row["role"] : "member";
  const address = textOf(row["address"]);
  return { workspaceId: row["workspaceId"], name: textOf(row["name"], address), address, role };
};

const manager = (row: Json): ManagerLink | undefined =>
  typeof row["managerId"] === "string"
    ? { managerId: row["managerId"], name: textOf(row["name"], row["managerId"]), address: textOf(row["address"]) }
    : undefined;

const hit = (row: Json): SearchResult | undefined =>
  (row["kind"] === "page" || row["kind"] === "task" || row["kind"] === "manager" || row["kind"] === "person") &&
  typeof row["id"] === "string" &&
  typeof row["managerId"] === "string"
    ? { kind: row["kind"], id: row["id"], managerId: row["managerId"], title: textOf(row["title"]), snippet: textOf(row["snippet"]) }
    : undefined;

/** Questions and approvals nobody has answered. A notice is only to read. */
const waits = (item: unknown): boolean => isRecord(item) && item["kind"] !== "notice" && item["answer"] === undefined;

const base = (workspaceId: string): string => `/api/workspaces/${encodeURIComponent(workspaceId)}`;

const settingsOf = (value: unknown): Readonly<Record<string, Permission>> =>
  Object.fromEntries(
    Object.entries(isRecord(value) ? value : {}).flatMap(([key, setting]): [string, Permission][] =>
      setting === "on" || setting === "off" || setting === "ask" ? [[key, setting]] : [],
    ),
  );

/** `GET …/access`: `{own: {categories, actions}}`, what an Owner changed for the person. */
const ownOf = (body: unknown): PermissionSet | undefined =>
  isRecord(body) && isRecord(body["own"])
    ? { categories: settingsOf(body["own"]["categories"]), actions: settingsOf(body["own"]["actions"]) }
    : undefined;

export const createShellApi = (server: Server): ShellApi => ({
  workspaces: () => server.read("/api/workspaces", (body) => (isRecord(body) ? each(body["workspaces"], workspace) : undefined)),
  managers: (id) => server.read(`${base(id)}/managers`, (body) => (isRecord(body) ? each(body["managers"], manager) : undefined)),
  own: (id) => server.read(`${base(id)}/access`, ownOf),
  waiting: (id) => server.read(`${base(id)}/inbox`, (body) => (isRecord(body) ? arrayOf(body["items"]).filter(waits).length : undefined)),
  search: (id, query) =>
    server.read(`${base(id)}/search?q=${encodeURIComponent(query)}`, (body) => (isRecord(body) ? each(body["hits"], hit) : undefined)),
  createManager: (id, input) =>
    server.write("POST", `${base(id)}/managers`, input, (body) =>
      isRecord(body) && isRecord(body["manager"]) ? manager(body["manager"]) : undefined,
    ),
});

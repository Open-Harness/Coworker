import type { ManagerEntry, TemplateId, WorkspaceProfile } from "../types.ts";

const TEMPLATES: readonly string[] = ["kanban", "incident", "support", "research"] satisfies readonly TemplateId[];
const isTemplate = (value: string): value is TemplateId => TEMPLATES.includes(value);

export const slugOf = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 24)
    .replace(/-+$/u, "");

/** Where people email a manager. The email module reads it back (`parseAddress`). */
export const addressFor = (slug: string, workspace: string, mailDomain: string): string => `${slug}.${workspace}@${mailDomain}`;

interface Row extends Record<string, SqlStorageValue> {
  manager_id: string;
  name: string;
  slug: string;
  address: string;
  template: string;
  object_id: string;
  created_by: string;
  created_at: number;
}

const entryOf = (row: Row, region: WorkspaceProfile["region"]): ManagerEntry => ({
  managerId: row.manager_id,
  name: row.name,
  slug: row.slug,
  address: row.address,
  template: isTemplate(row.template) ? row.template : "kanban",
  objectId: row.object_id,
  region,
  createdAt: row.created_at,
});

export const listManagers = (sql: SqlStorage, workspace: WorkspaceProfile): readonly ManagerEntry[] =>
  sql
    .exec<Row>("SELECT * FROM manager ORDER BY created_at, manager_id")
    .toArray()
    .map((row) => entryOf(row, workspace.region));

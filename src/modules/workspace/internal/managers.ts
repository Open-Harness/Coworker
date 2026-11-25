import { isTemplate } from "~/modules/manager/service.ts";
import type { ManagerObjects } from "~/modules/manager/types.ts";
import type { CreateManager, CreateManagerResult, ManagerEntry, WorkspaceProfile } from "../types.ts";

/**
 * What is before the `@` may be 64 characters. A workspace's address takes up to 30, and `.` and `+dt-12345` take 10: 24 are left.
 */
const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/u;
/** Local parts the platform keeps for itself. */
const RESERVED = new Set(["admin", "postmaster", "abuse", "noreply", "no-reply", "support-team", "mailer-daemon", "hostmaster"]);

const MAX_MISSION = 4_000;

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

function checkSlug(slug: string): string | undefined {
  if (!SLUG.test(slug)) return "Use 1 to 24 lowercase letters, digits and dashes, not starting or ending with a dash";
  if (slug.includes("--")) return "Two dashes in a row are not allowed";
  if (RESERVED.has(slug)) return "That address is kept for the platform";
  return undefined;
}

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

export interface ManagerPlace {
  readonly sql: SqlStorage;
  readonly workspace: WorkspaceProfile;
  /** This Workspace object's own id, so its managers can reach it. */
  readonly objectId: string;
  readonly objects: ManagerObjects;
  readonly mailDomain: string;
  readonly managerId: string;
  readonly now: number;
}

/** Makes the Manager object in the workspace's region, sets it up from its template, then lists it. */
export async function createManager(place: ManagerPlace, input: CreateManager): Promise<CreateManagerResult> {
  const { sql, workspace, objects, managerId, now } = place;
  const name = input.name.trim();
  if (name === "" || name.length > 60) return { _tag: "InvalidAddress", reason: "A manager needs a name of up to 60 characters" };
  const mission = input.mission?.trim();
  if (mission !== undefined && mission.length > MAX_MISSION)
    return { _tag: "InvalidAddress", reason: `A mission is at most ${MAX_MISSION} characters to start with` };
  const slug = input.slug ?? slugOf(name);
  const reason = checkSlug(slug);
  if (reason !== undefined) return { _tag: "InvalidAddress", reason };
  if (sql.exec("SELECT 1 FROM manager WHERE slug = ?", slug).toArray().length > 0) return { _tag: "AddressTaken" };
  const address = addressFor(slug, workspace.address, place.mailDomain);
  const { objectId, object } = objects.mint(workspace.region);
  const profile = {
    managerId,
    workspaceId: workspace.workspaceId,
    name,
    slug,
    address,
    template: input.template,
    ...(mission === undefined || mission === "" ? {} : { mission }),
    createdBy: input.createdBy,
    createdAt: now,
    workspaceObjectId: place.objectId,
    region: workspace.region,
  };
  try {
    const provisioned = await object.provision(profile);
    if (provisioned._tag === "NoModel") return { _tag: "Failed", message: provisioned.reason };
  } catch (error) {
    await object.destroy().catch(() => undefined);
    return { _tag: "Failed", message: error instanceof Error ? error.message : "The manager could not be made" };
  }
  sql.exec(
    "INSERT INTO manager (manager_id, name, slug, address, template, object_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    managerId,
    name,
    slug,
    address,
    input.template,
    objectId,
    input.createdBy,
    now,
  );
  return {
    _tag: "Created",
    manager: { managerId, name, slug, address, template: input.template, objectId, region: workspace.region, createdAt: now },
  };
}

/** Erases every manager's object; the rows go with the workspace's own storage. */
export async function destroyManagers(sql: SqlStorage, workspace: WorkspaceProfile, objects: ManagerObjects): Promise<void> {
  for (const manager of listManagers(sql, workspace)) await objects.get(manager.objectId, manager.region).destroy();
}

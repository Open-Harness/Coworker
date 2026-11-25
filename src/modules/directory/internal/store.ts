import { and, eq, inArray, lt, ne } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type { RowChange, WorkspaceRow } from "~/modules/protocol/types.ts";
import type { Projection } from "~/modules/chat-host/types.ts";
import type { WorkspacePhase } from "../types.ts";
import { workspaces } from "./schema.ts";

type Stored = typeof workspaces.$inferSelect;

const toRow = (stored: Stored): WorkspaceRow => ({
  id: stored.id,
  name: stored.name,
  pinned: stored.pinned,
  ...(stored.archivedAt === null ? {} : { archivedAt: stored.archivedAt }),
  createdAt: stored.createdAt,
  updatedAt: stored.updatedAt,
  createdBy: stored.createdBy,
  chats: stored.chats,
  documents: stored.documents,
});

/** The workspaces. Every change of a workspace's row goes through one of these. */
export class Store {
  readonly #db: DrizzleSqliteDODatabase;

  constructor(db: DrizzleSqliteDODatabase) {
    this.#db = db;
  }

  listed(): readonly WorkspaceRow[] {
    return this.#db.select().from(workspaces).where(eq(workspaces.phase, "active")).all().map(toRow);
  }

  unfinished(): readonly { readonly id: string; readonly name: string; readonly phase: WorkspacePhase }[] {
    return this.#db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.phase, ["provisioning", "deleting"]))
      .all();
  }

  find(id: string): { readonly phase: WorkspacePhase; readonly row: WorkspaceRow } | undefined {
    const stored = this.#db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    return stored === undefined ? undefined : { phase: stored.phase, row: toRow(stored) };
  }

  insert(id: string, name: string, createdBy: string, now: number): void {
    this.#db
      .insert(workspaces)
      .values({ id, name, phase: "provisioning", createdAt: now, updatedAt: now, createdBy, chats: [], documents: [] })
      .onConflictDoNothing()
      .run();
  }

  setPhase(id: string, phase: WorkspacePhase): void {
    this.#db
      .update(workspaces)
      .set({ phase, ...(phase === "deleted" ? { chats: [], documents: [] } : {}) })
      .where(and(eq(workspaces.id, id), ne(workspaces.phase, "deleted")))
      .run();
  }

  update(id: string, { title, pinned, archived }: RowChange, now: number): WorkspaceRow | undefined {
    const change = {
      ...(title === undefined ? {} : { name: title.trim() }),
      ...(pinned === undefined ? {} : { pinned }),
      ...(archived === undefined ? {} : { archivedAt: archived ? now : null }),
    };
    if (Object.keys(change).length > 0) {
      this.#db
        .update(workspaces)
        .set(change)
        .where(and(eq(workspaces.id, id), eq(workspaces.phase, "active")))
        .run();
    }
    const found = this.find(id);
    return found?.phase === "active" ? found.row : undefined;
  }

  /** Stores a workspace's picture of itself, unless a newer one is already here. Returns the row when it changed. */
  project({ workspaceId, sequence, chats, documents }: Projection): WorkspaceRow | undefined {
    const updatedAt = Math.max(0, ...chats.map((chat) => chat.updatedAt), ...documents.map((row) => row.updatedAt));
    const changed = this.#db
      .update(workspaces)
      .set({ sequence, chats, documents, ...(updatedAt === 0 ? {} : { updatedAt }) })
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.phase, "active"), lt(workspaces.sequence, sequence)))
      .returning()
      .get();
    return changed === undefined ? undefined : toRow(changed);
  }
}

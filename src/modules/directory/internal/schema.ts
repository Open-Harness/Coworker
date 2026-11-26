import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { AgentConfig, DeployedTo } from "~/modules/agent-config/types.ts";
import type { ChatRow, DocumentRow } from "~/modules/protocol/types.ts";
import type { WorkspacePhase } from "../types.ts";

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    phase: text("phase").$type<WorkspacePhase>().notNull(),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    archivedAt: integer("archived_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    createdBy: text("created_by").notNull(),
    /** Sequence of the projection stored; an older one that arrives late is ignored. */
    sequence: integer("sequence").notNull().default(0),
    chats: text("chats", { mode: "json" }).$type<readonly ChatRow[]>().notNull(),
    documents: text("documents", { mode: "json" }).$type<readonly DocumentRow[]>().notNull(),
  },
  (table) => [index("workspaces_phase").on(table.phase)],
);

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  /** The latest version. */
  version: integer("version").notNull(),
  createdAt: integer("created_at").notNull(),
  createdBy: text("created_by").notNull(),
  deployedVersion: integer("deployed_version"),
  deployedTo: text("deployed_to", { mode: "json" }).$type<DeployedTo>(),
  deployedAt: integer("deployed_at"),
  deployedBy: text("deployed_by"),
  /** Set once. Keeps the id from being used again. */
  deletedAt: integer("deleted_at"),
});

export const agentVersions = sqliteTable(
  "agent_versions",
  {
    agentId: text("agent_id").notNull(),
    version: integer("version").notNull(),
    config: text("config", { mode: "json" }).$type<AgentConfig>().notNull(),
    savedAt: integer("saved_at").notNull(),
    savedBy: text("saved_by").notNull(),
    /** The request that saved it, so a repeated request saves nothing again. */
    requestId: text("request_id").notNull(),
  },
  (table) => [primaryKey({ columns: [table.agentId, table.version] })],
);

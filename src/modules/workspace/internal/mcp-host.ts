import { createServers } from "~/modules/mcp-servers/service.ts";
import type { Held, McpStore, Servers } from "~/modules/mcp-servers/types.ts";
import type { Vault } from "~/modules/vault/types.ts";
import type { WorkspaceDependencies } from "../types.ts";

/* The MCP servers of the workspace, in its own object: each as it was added, and its secret in the vault. */

export const MCP_MIGRATIONS: readonly string[] = [
  `CREATE TABLE mcp_server (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, json TEXT NOT NULL)`,
];

function storeOver(sql: SqlStorage): McpStore {
  return {
    all: () =>
      sql
        .exec("SELECT json FROM mcp_server ORDER BY seq")
        .toArray()
        .map((row) => JSON.parse(String(row["json"])) as Held),
    put: (held) =>
      void sql.exec(
        `INSERT INTO mcp_server (id, seq, json) VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM mcp_server), ?)
         ON CONFLICT (id) DO UPDATE SET json = excluded.json`,
        held.server.id,
        JSON.stringify(held),
      ),
  };
}

export function serversOf(sql: SqlStorage, deps: WorkspaceDependencies, vault: Vault): Servers {
  return createServers({
    store: storeOver(sql),
    fetch: deps.fetch,
    secrets: {
      put: (name, value) => vault.put(name, value),
      use: async (name, run) => {
        const used = await vault.use(name, run);
        return used._tag === "Used" ? used.value : undefined;
      },
    },
    clock: deps.clock,
    ids: deps.ids,
  });
}

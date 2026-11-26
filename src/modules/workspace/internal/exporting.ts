import type { ManagerRow } from "~/modules/console/types.ts";
import type { ManagerStores } from "~/modules/manager-store/types.ts";
import { mailStoreOver } from "./mailing-host.ts";

/*
 * What the managers and the console keep, for the export of the whole workspace: each manager's playbook, version by version, its work and what
 * waits for a person; what came in and what became of it; the mailbox; the servers. A secret is never here: a server's sign-in is the name of
 * a vault entry, and a key is not kept in a prompt or a row.
 */

const parsed = <T>(value: SqlStorageValue | undefined): T => JSON.parse(String(value)) as T;
const all = (sql: SqlStorage, query: string): readonly Record<string, SqlStorageValue>[] => sql.exec(query).toArray();

async function managerOf(stores: ManagerStores, row: ManagerRow) {
  const store = stores.get(row.objectId, row.region);
  const [versions, board, asks, usage] = await Promise.all([store.versions(), store.board(), store.asks(), store.usage()]);
  const work = await Promise.all(board.map(({ work: one }) => store.work(one.id)));
  return { manager: row, versions, board, work: work.flatMap((one) => (one === undefined ? [] : [one])), asks, usage };
}

export async function exportedOf(sql: SqlStorage, stores: ManagerStores): Promise<Readonly<Record<string, unknown>>> {
  const rows = all(sql, "SELECT row FROM console_manager ORDER BY at, id").map((row) => parsed<ManagerRow>(row["row"]));
  return {
    "workspace/managers": await Promise.all(rows.map((row) => managerOf(stores, row))),
    "workspace/items": all(sql, "SELECT item, hears, decision FROM console_item ORDER BY seq").map((row) => ({
      item: parsed<unknown>(row["item"]),
      hears: parsed<unknown>(row["hears"]),
      decision: typeof row["decision"] === "string" ? parsed<unknown>(row["decision"]) : null,
    })),
    "workspace/settings": Object.fromEntries(
      all(sql, "SELECT name, value FROM console_setting").map((row) => [String(row["name"]), parsed<unknown>(row["value"])]),
    ),
    "workspace/kept": all(sql, "SELECT kind, id, json FROM console_kept ORDER BY seq").map((row) => ({
      kind: row["kind"],
      id: row["id"],
      value: parsed<unknown>(row["json"]),
    })),
    "workspace/audit": all(sql, "SELECT * FROM console_audit ORDER BY id"),
    "workspace/asks": all(sql, "SELECT json FROM console_ask ORDER BY seq").map((row) => parsed<unknown>(row["json"])),
    "workspace/mailbox": Object.values(mailStoreOver(sql).mails()),
    "workspace/mcp-servers": all(sql, "SELECT json FROM mcp_server ORDER BY seq").map((row) => parsed<unknown>(row["json"])),
  };
}

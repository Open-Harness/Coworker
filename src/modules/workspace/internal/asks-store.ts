import type { Rule } from "~/modules/asks/types.ts";
import type { AskStore, Kept } from "~/modules/asking/types.ts";

/* What the workspace keeps of what waits for a person: one row for each ask, and the rules a person made with "always". */

export const ASKS_MIGRATIONS: readonly string[] = [
  `CREATE TABLE ask (id TEXT PRIMARY KEY, state TEXT NOT NULL, told INTEGER NOT NULL, at INTEGER NOT NULL, json TEXT NOT NULL)`,
  `CREATE TABLE ask_rule (id TEXT PRIMARY KEY, json TEXT NOT NULL)`,
];

const kept = (row: Record<string, SqlStorageValue>): Kept => JSON.parse(String(row["json"])) as Kept;

export const asksStoreOver = (sql: SqlStorage): AskStore => ({
  get: (id) => {
    const row = sql.exec("SELECT json FROM ask WHERE id = ?", id).toArray()[0];
    return row === undefined ? undefined : kept(row);
  },
  put: (one) =>
    void sql.exec(
      `INSERT INTO ask (id, state, told, at, json) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET state = excluded.state, told = excluded.told, json = excluded.json`,
      one.ask.id,
      one.ask.state._tag,
      one.told ? 1 : 0,
      one.ask.at,
      JSON.stringify(one),
    ),
  open: () => sql.exec("SELECT json FROM ask WHERE state = 'Open' ORDER BY at, id").toArray().map(kept),
  untold: () => sql.exec("SELECT json FROM ask WHERE state = 'Answered' AND told = 0 ORDER BY at, id").toArray().map(kept),
  rules: () =>
    sql
      .exec("SELECT json FROM ask_rule ORDER BY rowid")
      .toArray()
      .map((row) => JSON.parse(String(row["json"])) as Rule),
  putRule: (rule) =>
    void sql.exec(
      "INSERT INTO ask_rule (id, json) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET json = excluded.json",
      rule.id,
      JSON.stringify(rule),
    ),
});

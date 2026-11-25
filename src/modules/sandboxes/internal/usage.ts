/** Takes an environment away with what names it. The meter's lines stay: what ran was used. */
export function deleteEnvironment(sql: SqlStorage, id: string): void {
  sql.exec("DELETE FROM agent_environment WHERE environment_id = ?", id);
  sql.exec("DELETE FROM environment_build WHERE environment_id = ?", id);
  sql.exec("DELETE FROM run_image WHERE environment_id = ?", id);
  sql.exec("DELETE FROM environment WHERE id = ?", id);
}

/** Container seconds since a time, by manager ("" for what no run asked for). */
export function usedByManager(sql: SqlStorage, since: number): Readonly<Record<string, number>> {
  return Object.fromEntries(
    sql
      .exec<{ manager_id: string; seconds: number }>(
        "SELECT manager_id, SUM(seconds) AS seconds FROM sandbox_use WHERE at >= ? GROUP BY manager_id",
        since,
      )
      .toArray()
      .map(({ manager_id, seconds }) => [manager_id, seconds]),
  );
}

export const usedByDay = (sql: SqlStorage, since: number): readonly { readonly day: string; readonly seconds: number }[] =>
  sql
    .exec<{ day: string; seconds: number }>(
      "SELECT strftime('%Y-%m-%d', at / 1000, 'unixepoch') AS day, SUM(seconds) AS seconds FROM sandbox_use WHERE at >= ? GROUP BY day ORDER BY day",
      since,
    )
    .toArray();

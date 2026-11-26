import type { Ask } from "~/modules/asks/types.ts";

/* What waits for a person and is the workspace's own, not a manager's: today, that the GitHub App must be installed again. */

export const WORKSPACE_ASK_MIGRATIONS: readonly string[] = [
  `CREATE TABLE console_ask (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, json TEXT NOT NULL)`,
];

const DAY = 86_400_000;
const parsed = (value: SqlStorageValue | undefined): Ask => JSON.parse(String(value)) as Ask;

export function workspaceAsks(sql: SqlStorage): readonly Ask[] {
  return sql
    .exec("SELECT json FROM console_ask ORDER BY seq")
    .toArray()
    .map((row) => parsed(row["json"]));
}

/** Each Owner is asked once, by the installation and the moment it was lost: the same loss heard twice is one ask. */
export function askToInstall(sql: SqlStorage, installation: number, account: string, owners: readonly string[], now: number): void {
  for (const owner of owners) {
    const ask: Ask = {
      id: `github-lost:${installation}:${owner}`,
      to: owner,
      need: "do",
      about: { manager: "", title: "The GitHub App" },
      question: `The GitHub App was uninstalled from ${account}. Install it again, and the managers hear their repos once more.`,
      why: "Nothing that happens on GitHub reaches the managers while the App is away.",
      options: [],
      best: null,
      shows: null,
      at: now,
      by: now + 3 * DAY,
      then: [],
      else: "wait",
      reminded: 0,
      state: { _tag: "Open" },
    };
    sql.exec("INSERT OR IGNORE INTO console_ask (id, seq, json) VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM console_ask), ?)", ask.id, JSON.stringify(ask));
  }
}

/** The App is back: what asked for it is gone, and says why. */
export function installedAgain(sql: SqlStorage, installation: number): void {
  for (const ask of workspaceAsks(sql)) {
    if (!ask.id.startsWith(`github-lost:${installation}:`) || ask.state._tag !== "Open") continue;
    const gone: Ask = { ...ask, state: { _tag: "Gone", why: "The App is installed again." } };
    sql.exec("UPDATE console_ask SET json = ? WHERE id = ?", JSON.stringify(gone), ask.id);
  }
}

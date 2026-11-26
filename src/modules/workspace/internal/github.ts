import type { GitHubConnection, GitHubEvent, Installation, LostConnection, RepoSource } from "~/modules/github/types.ts";
import type { SetSourcesResult } from "../types.ts";
import { notify } from "./inbox.ts";

/*
 * The workspace's one GitHub installation and, per manager, the repos it hears and which events. Removing the
 * installation stops every GitHub source at once.
 */

export const GITHUB_MIGRATIONS: readonly string[] = [
  "CREATE TABLE github (only INTEGER PRIMARY KEY CHECK (only = 1), installation INTEGER NOT NULL, account TEXT NOT NULL, repos TEXT NOT NULL)",
  "CREATE TABLE github_source (manager_id TEXT NOT NULL, repo TEXT NOT NULL, events TEXT NOT NULL, PRIMARY KEY (manager_id, repo))",
];

/** Appended after the first ones: what the App was on, when it was uninstalled, so the screens can say so. */
export const GITHUB_LOST_MIGRATIONS: readonly string[] = [
  "CREATE TABLE github_lost (only INTEGER PRIMARY KEY CHECK (only = 1), account TEXT NOT NULL, at INTEGER NOT NULL, sources TEXT NOT NULL)",
];

function installationOf(sql: SqlStorage): Installation | undefined {
  const row = sql.exec<{ installation: number; account: string; repos: string }>("SELECT * FROM github").toArray()[0];
  return row === undefined ? undefined : { id: row.installation, account: row.account, repos: JSON.parse(row.repos) as string[] };
}

function sourcesOf(sql: SqlStorage): readonly RepoSource[] {
  return sql
    .exec<{ manager_id: string; repo: string; events: string }>("SELECT * FROM github_source ORDER BY manager_id, repo")
    .toArray()
    .map((row): RepoSource => ({ managerId: row.manager_id, repo: row.repo, events: JSON.parse(row.events) as GitHubEvent[] }));
}

/** What the App was on when it was uninstalled; nothing once it is installed again. */
export function lostConnection(sql: SqlStorage): LostConnection | undefined {
  const row = sql.exec<{ account: string; at: number; sources: string }>("SELECT * FROM github_lost").toArray()[0];
  return row === undefined ? undefined : { account: row.account, at: row.at, sources: JSON.parse(row.sources) as RepoSource[] };
}

export function connection(sql: SqlStorage): GitHubConnection {
  const installation = installationOf(sql);
  return { ...(installation === undefined ? {} : { installation }), sources: sourcesOf(sql) };
}

/** One installation per workspace: connecting another replaces it, and sources on repos it cannot reach stop. */
export function connect(sql: SqlStorage, installation: Installation): GitHubConnection {
  sql.exec("DELETE FROM github_lost");
  sql.exec(
    "INSERT INTO github (only, installation, account, repos) VALUES (1, ?, ?, ?) ON CONFLICT (only) DO UPDATE SET installation = excluded.installation, account = excluded.account, repos = excluded.repos",
    installation.id,
    installation.account,
    JSON.stringify(installation.repos),
  );
  for (const { managerId, repo } of connection(sql).sources) {
    if (!installation.repos.includes(repo)) sql.exec("DELETE FROM github_source WHERE manager_id = ? AND repo = ?", managerId, repo);
  }
  return connection(sql);
}

/** What a manager hears: these repos, each with its events. Sent again, it replaces the manager's list. */
export function setSources(
  sql: SqlStorage,
  managerId: string,
  sources: readonly { readonly repo: string; readonly events: readonly GitHubEvent[] }[],
): SetSourcesResult {
  const installation = installationOf(sql);
  if (installation === undefined) return { _tag: "NotConnected" };
  const missing = sources.find(({ repo }) => !installation.repos.includes(repo));
  if (missing !== undefined) return { _tag: "NotReachable", repo: missing.repo };
  sql.exec("DELETE FROM github_source WHERE manager_id = ?", managerId);
  for (const { repo, events } of sources) {
    sql.exec("INSERT INTO github_source (manager_id, repo, events) VALUES (?, ?, ?)", managerId, repo, JSON.stringify(events));
  }
  return { _tag: "Set", connection: connection(sql) };
}

/** The App was uninstalled: every GitHub source stops, and each Owner gets a notice. */
export function removed(sql: SqlStorage, id: number, owners: readonly string[], now: number): void {
  const installation = installationOf(sql);
  if (installation?.id !== id) return;
  sql.exec(
    "INSERT INTO github_lost (only, account, at, sources) VALUES (1, ?, ?, ?) ON CONFLICT (only) DO UPDATE SET account = excluded.account, at = excluded.at, sources = excluded.sources",
    installation.account,
    now,
    JSON.stringify(sourcesOf(sql)),
  );
  sql.exec("DELETE FROM github_source");
  sql.exec("DELETE FROM github");
  const title = `The GitHub App was uninstalled from ${installation.account}. Managers no longer hear its repos; install it again to reconnect them.`;
  for (const owner of owners) notify(sql, { id: `github-removed:${id}:${owner}:${now}`, to: owner, title }, now);
}

/** The App is back, as the same installation: what it was on is connected again, and each manager hears what it heard. */
export function restored(sql: SqlStorage, id: number): boolean {
  const lost = lostConnection(sql);
  if (lost === undefined) return false;
  connect(sql, { id, account: lost.account, repos: [...new Set(lost.sources.map(({ repo }) => repo))] });
  for (const managerId of new Set(lost.sources.map((source) => source.managerId))) {
    setSources(
      sql,
      managerId,
      lost.sources.filter((source) => source.managerId === managerId).map(({ repo, events }) => ({ repo, events })),
    );
  }
  return true;
}

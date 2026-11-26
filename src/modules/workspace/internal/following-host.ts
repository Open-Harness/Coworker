import { createFollowing } from "~/modules/following/service.ts";
import type { Following, FollowStore, Listener, News, Wanted } from "~/modules/following/types.ts";
import type { Kept } from "~/modules/github-events/types.ts";
import type { ManagerRow } from "~/modules/console/types.ts";
import type { WorkspaceDependencies } from "../types.ts";
import { connection } from "./github.ts";

/* What follows a conversation on GitHub, in the workspace's object: the records of each repo, what became true and is not yet told, and what to ask GitHub. */

export const FOLLOWING_MIGRATIONS: readonly string[] = [
  `CREATE TABLE follow_kept (repo TEXT PRIMARY KEY, kept TEXT NOT NULL)`,
  `CREATE TABLE follow_news (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, json TEXT NOT NULL, told INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE follow_want (repo TEXT NOT NULL, number INTEGER NOT NULL, json TEXT NOT NULL, PRIMARY KEY (repo, number))`,
];

const parsed = <T>(value: SqlStorageValue | undefined): T => JSON.parse(String(value)) as T;

export function followStoreOver(sql: SqlStorage): FollowStore {
  return {
    kept: (repo) => {
      const row = sql.exec("SELECT kept FROM follow_kept WHERE repo = ?", repo).toArray()[0];
      return row === undefined ? {} : parsed<Kept>(row["kept"]);
    },
    keep: (repo, kept) =>
      void sql.exec(
        "INSERT INTO follow_kept (repo, kept) VALUES (?, ?) ON CONFLICT (repo) DO UPDATE SET kept = excluded.kept",
        repo,
        JSON.stringify(kept),
      ),
    addNews: (news) => {
      for (const one of news)
        sql.exec(
          "INSERT OR IGNORE INTO follow_news (id, seq, json) VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM follow_news), ?)",
          one.id,
          JSON.stringify(one),
        );
    },
    news: () =>
      sql
        .exec("SELECT json FROM follow_news WHERE told = 0 ORDER BY seq")
        .toArray()
        .map((row) => parsed<News>(row["json"])),
    told: (id) => void sql.exec("UPDATE follow_news SET told = 1 WHERE id = ?", id),
    want: (wanted) =>
      void sql.exec("INSERT OR IGNORE INTO follow_want (repo, number, json) VALUES (?, ?, ?)", wanted.repo, wanted.number, JSON.stringify(wanted)),
    wanted: () =>
      sql
        .exec("SELECT json FROM follow_want ORDER BY repo, number")
        .toArray()
        .map((row) => parsed<Wanted>(row["json"])),
    got: (repo, number) => void sql.exec("DELETE FROM follow_want WHERE repo = ? AND number = ?", repo, number),
    repos: () =>
      sql
        .exec("SELECT repo FROM follow_kept ORDER BY repo")
        .toArray()
        .map((row) => String(row["repo"])),
  };
}

export function followingOf(sql: SqlStorage, dependencies: WorkspaceDependencies): Following {
  const { stores, clock, github, fetch } = dependencies;
  const managers = (): readonly ManagerRow[] =>
    sql
      .exec("SELECT row FROM console_manager ORDER BY at, id")
      .toArray()
      .map((row) => parsed<ManagerRow>(row["row"]));
  return createFollowing({
    store: followStoreOver(sql),
    clock,
    listeners: async (repo) =>
      managers()
        .filter((row) => row.hears.includes(repo))
        .map((row): Listener => {
          const store = stores.get(row.objectId, row.region);
          return { open: async () => (await store.hearing())?.open ?? [], news: (input) => store.news(input) };
        }),
    read: async (repo, path) => {
      const installation = connection(sql).installation?.id;
      if (installation === undefined) return undefined;
      const made = await github.token(installation, repo, { pull_requests: "read", issues: "read", checks: "read" });
      if (made._tag === "Failed") return undefined;
      const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
        headers: { authorization: `Bearer ${made.token.token}`, accept: "application/vnd.github+json", "user-agent": "co-worker" },
      }).catch(() => undefined);
      return response?.ok === true ? await response.json().catch(() => undefined) : undefined;
    },
  });
}

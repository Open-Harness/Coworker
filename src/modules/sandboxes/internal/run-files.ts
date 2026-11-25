import type { CommandRequest } from "../types.ts";

/** What a run's commands left, as an image its next command starts from. Runs after the tables that came before it. */
export const RUN_FILES_MIGRATIONS: readonly string[] = [
  `CREATE TABLE run_image (
     manager_id TEXT NOT NULL, run TEXT NOT NULL, environment_id TEXT NOT NULL, image TEXT NOT NULL, at INTEGER NOT NULL,
     PRIMARY KEY (manager_id, run))`,
];

const KEPT_FOR_MS = 30 * 24 * 60 * 60_000;

/** A run that changed environment starts over: its files belong to the one it had. */
export const runImage = (sql: SqlStorage, request: CommandRequest, environmentId: string): string | undefined =>
  sql
    .exec<{ image: string }>(
      "SELECT image FROM run_image WHERE manager_id = ? AND run = ? AND environment_id = ?",
      request.managerId,
      request.run,
      environmentId,
    )
    .toArray()[0]?.image;

export function keepRunImage(sql: SqlStorage, request: CommandRequest, environmentId: string, image: string, at: number): void {
  sql.exec("DELETE FROM run_image WHERE at < ?", at - KEPT_FOR_MS);
  sql.exec(
    "INSERT OR REPLACE INTO run_image (manager_id, run, environment_id, image, at) VALUES (?, ?, ?, ?, ?)",
    request.managerId,
    request.run,
    environmentId,
    image,
    at,
  );
}

export function dropRunImage(sql: SqlStorage, request: CommandRequest): void {
  sql.exec("DELETE FROM run_image WHERE manager_id = ? AND run = ?", request.managerId, request.run);
}

/** One run's commands one after another, so none starts before the files of the one ahead of it are kept. */
export function inTurn<T>(turns: Map<string, Promise<unknown>>, request: CommandRequest, work: () => Promise<T>): Promise<T> {
  const key = `${request.managerId}:${request.run}`;
  const mine = (turns.get(key) ?? Promise.resolve()).then(work, work);
  turns.set(key, mine);
  const done = () => void (turns.get(key) === mine && turns.delete(key));
  mine.then(done, done);
  return mine;
}

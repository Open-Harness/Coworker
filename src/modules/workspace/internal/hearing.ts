import { triggers } from "~/modules/triggers/service.ts";
import type { Policy, Routed, Trigger } from "~/modules/triggers/types.ts";
import type { EventEntry } from "../types.ts";
import { personFor } from "./people.ts";

/*
 * Every Trigger is stored here once, by its id. A Trigger on a Thread a Task follows goes to that manager as a
 * follow-up; anything else passes the Gate. One line per Trigger goes to the manager's Events.
 */

export const HEARING_MIGRATIONS: readonly string[] = [
  "CREATE TABLE trigger (id TEXT PRIMARY KEY, manager_id TEXT NOT NULL, at INTEGER NOT NULL, routed TEXT NOT NULL)",
  `CREATE TABLE follow (thread TEXT NOT NULL, manager_id TEXT NOT NULL, task TEXT NOT NULL, PRIMARY KEY (thread, manager_id))`,
  "CREATE TABLE event (id INTEGER PRIMARY KEY AUTOINCREMENT, manager_id TEXT NOT NULL, at INTEGER NOT NULL, line TEXT NOT NULL)",
  "CREATE TABLE policy (manager_id TEXT PRIMARY KEY, body TEXT NOT NULL)",
];

/** Appended after the first ones, so objects already made take only these. */
export const EVENT_TRIGGER_MIGRATIONS: readonly string[] = ["ALTER TABLE event ADD COLUMN trigger TEXT"];

const threadKey = ({ kind, key }: Trigger["threads"][number]): string => `${kind}:${key}`;

export function readPolicy(sql: SqlStorage, managerId: string): Policy {
  const row = sql.exec<{ body: string }>("SELECT body FROM policy WHERE manager_id = ?", managerId).toArray()[0];
  return row === undefined ? triggers.defaultPolicy : triggers.policyOf(JSON.parse(row.body));
}

export function writePolicy(sql: SqlStorage, managerId: string, policy: Policy): Policy {
  sql.exec(
    "INSERT INTO policy (manager_id, body) VALUES (?, ?) ON CONFLICT (manager_id) DO UPDATE SET body = excluded.body",
    managerId,
    JSON.stringify(policy),
  );
  return policy;
}

export function logEvent(sql: SqlStorage, managerId: string, at: number, line: string, trigger?: string): void {
  sql.exec("INSERT INTO event (manager_id, at, line, trigger) VALUES (?, ?, ?, ?)", managerId, at, line, trigger ?? null);
}

export const eventsOf = (sql: SqlStorage, managerId: string, limit: number): readonly EventEntry[] =>
  sql
    .exec<{ at: number; line: string; trigger: string | null }>(
      "SELECT at, line, trigger FROM event WHERE manager_id = ? ORDER BY id DESC LIMIT ?",
      managerId,
      limit,
    )
    .toArray()
    .map(({ at, line, trigger }) => ({ at, line, ...(trigger === null ? {} : { trigger }) }));

/** Subscribes a Task to Threads, so what arrives on them comes back as a follow-up. */
export function follow(sql: SqlStorage, managerId: string, task: string, threads: Trigger["threads"]): void {
  for (const thread of threads) {
    sql.exec("INSERT INTO follow (thread, manager_id, task) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", threadKey(thread), managerId, task);
  }
}

function followed(sql: SqlStorage, trigger: Trigger): string | undefined {
  for (const thread of trigger.threads) {
    const row = sql
      .exec<{ task: string }>("SELECT task FROM follow WHERE thread = ? AND manager_id = ?", threadKey(thread), trigger.managerId)
      .toArray()[0];
    if (row !== undefined) return row.task;
  }
  return undefined;
}

const from = (trigger: Trigger): string => `${trigger.source} from ${trigger.actor.display ?? trigger.actor.id}: “${trigger.title}”`;

function lineOf(trigger: Trigger, routed: Routed): string {
  switch (routed._tag) {
    case "FollowUp":
      return `${from(trigger)} → follow-up on ${routed.task}`;
    case "Candidate":
      return `${from(trigger)} → ${routed.strength} candidate`;
    case "Ignored":
    case "Dropped":
      return `${from(trigger)} → ignored: ${routed.reason}`;
    case "Duplicate":
    case "Failed":
      return from(trigger);
  }
}

/** Stores and routes a Trigger. Returns what it did and, for work, hands it to `deliver` before answering. */
export async function receive(
  sql: SqlStorage,
  trigger: Trigger,
  now: number,
  deliver: (routed: Extract<Routed, { _tag: "FollowUp" | "Candidate" }>) => Promise<void>,
): Promise<Routed> {
  if (sql.exec("SELECT 1 FROM trigger WHERE id = ?", trigger.id).toArray().length > 0) return { _tag: "Duplicate" };
  const task = trigger.task ?? followed(sql, trigger);
  const routed: Routed =
    task !== undefined
      ? { _tag: "FollowUp", task }
      : triggers.gate(trigger, readPolicy(sql, trigger.managerId), personFor(sql, trigger.actor));
  sql.exec(
    "INSERT INTO trigger (id, manager_id, at, routed) VALUES (?, ?, ?, ?)",
    trigger.id,
    trigger.managerId,
    now,
    JSON.stringify(routed),
  );
  // A follow-up on one Thread that names others, as a pull request names its issue, follows them too.
  if (routed._tag === "FollowUp") follow(sql, trigger.managerId, routed.task, trigger.threads);
  if (routed._tag === "FollowUp" || routed._tag === "Candidate") {
    try {
      await deliver(routed);
    } catch (error) {
      // Nothing is kept, so the platform's own retry delivers it again.
      sql.exec("DELETE FROM trigger WHERE id = ?", trigger.id);
      return { _tag: "Failed", reason: error instanceof Error ? error.message : String(error) };
    }
  }
  logEvent(sql, trigger.managerId, now, lineOf(trigger, routed), trigger.id);
  return routed;
}

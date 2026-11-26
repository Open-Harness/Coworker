import type { Ask } from "~/modules/asks/types.ts";
import type { ActivityLine, Hold, Job, Message, Spend, Store, StoredJob, ThreadRow } from "~/modules/working/types.ts";
import type { Work } from "~/modules/work/types.ts";

/** What a manager keeps of its work. Every statement runs once, in order, after the manager's own tables. */
export const WORK_MIGRATIONS: readonly string[] = [
  `CREATE TABLE work (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, json TEXT NOT NULL)`,
  `CREATE TABLE seen (key TEXT PRIMARY KEY)`,
  `CREATE TABLE job (seq INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, work TEXT NOT NULL, json TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE thread (id TEXT PRIMARY KEY, work TEXT NOT NULL, agent TEXT NOT NULL, role TEXT NOT NULL, step TEXT NOT NULL, state TEXT NOT NULL,
     started INTEGER NOT NULL, brief TEXT NOT NULL, said TEXT NOT NULL, model TEXT)`,
  `CREATE TABLE message (thread TEXT NOT NULL, n INTEGER NOT NULL, json TEXT NOT NULL, PRIMARY KEY (thread, n))`,
  `CREATE TABLE spend (call TEXT PRIMARY KEY, work TEXT NOT NULL, thread TEXT NOT NULL, connection TEXT NOT NULL, model TEXT NOT NULL,
     input INTEGER NOT NULL, cached INTEGER NOT NULL, output INTEGER NOT NULL, dollars REAL, at INTEGER NOT NULL)`,
  `CREATE TABLE hold (work TEXT PRIMARY KEY, why TEXT NOT NULL, retry INTEGER NOT NULL)`,
  `CREATE TABLE once (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];

/** What the work's page shows of what happened, and what waits for a person. Appended after the others. */
export const STAYS_MIGRATIONS: readonly string[] = [
  `CREATE TABLE activity (work TEXT NOT NULL, n INTEGER NOT NULL, at INTEGER NOT NULL, who TEXT NOT NULL, text TEXT NOT NULL, PRIMARY KEY (work, n))`,
  `CREATE TABLE ask (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, json TEXT NOT NULL)`,
];

const parsed = <T>(value: SqlStorageValue | undefined): T => JSON.parse(String(value)) as T;
const maybe = (value: SqlStorageValue | undefined): string | null => (typeof value === "string" ? value : null);

function threadOf(row: Record<string, SqlStorageValue>): ThreadRow {
  return {
    id: String(row["id"]),
    work: String(row["work"]),
    agent: String(row["agent"]),
    role: row["role"] === "checks" ? "checks" : "does",
    step: String(row["step"]),
    state: row["state"] === "ended" ? "ended" : "working",
    started: Number(row["started"]),
    brief: String(row["brief"]),
    said: String(row["said"]),
    model: maybe(row["model"]),
  };
}

/** The manager's own storage, as the working of its work asks for it. */
export function workStore(storage: DurableObjectStorage): Store {
  const { sql } = storage;
  let depth = 0;
  return {
    // Nested calls join the outermost one: a transaction is all or nothing, however it is built.
    transaction: (run) => {
      if (depth > 0) return run();
      depth += 1;
      try {
        return storage.transactionSync(run);
      } finally {
        depth -= 1;
      }
    },
    work: (id) => {
      const row = sql.exec("SELECT json FROM work WHERE id = ?", id).toArray()[0];
      return row === undefined ? undefined : parsed<Work>(row["json"]);
    },
    works: () =>
      sql
        .exec("SELECT json FROM work ORDER BY seq")
        .toArray()
        .map((row) => parsed<Work>(row["json"])),
    putWork: (work) =>
      void sql.exec(
        `INSERT INTO work (id, seq, json) VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM work), ?)
         ON CONFLICT (id) DO UPDATE SET json = excluded.json`,
        work.id,
        JSON.stringify(work),
      ),
    seen: (key) => sql.exec("SELECT 1 FROM seen WHERE key = ?", key).toArray().length > 0,
    see: (key) => void sql.exec("INSERT OR IGNORE INTO seen (key) VALUES (?)", key),
    addJobs: (work, jobs) => {
      for (const job of jobs) sql.exec("INSERT OR IGNORE INTO job (key, work, json) VALUES (?, ?, ?)", job.key, work, JSON.stringify(job));
    },
    nextJob: (work) => {
      const row = sql.exec("SELECT seq, json FROM job WHERE work = ? AND done = 0 ORDER BY seq LIMIT 1", work).toArray()[0];
      return row === undefined ? undefined : ({ seq: Number(row["seq"]), work, job: parsed<Job>(row["json"]) } satisfies StoredJob);
    },
    finishJob: (key) => void sql.exec("UPDATE job SET done = 1 WHERE key = ?", key),
    busy: () =>
      sql
        .exec("SELECT DISTINCT work FROM job WHERE done = 0")
        .toArray()
        .map((row) => String(row["work"])),
    thread: (id) => {
      const row = sql.exec("SELECT * FROM thread WHERE id = ?", id).toArray()[0];
      return row === undefined ? undefined : threadOf(row);
    },
    threadsOf: (work) => sql.exec("SELECT * FROM thread WHERE work = ? ORDER BY started, id", work).toArray().map(threadOf),
    putThread: (row) =>
      void sql.exec(
        `INSERT INTO thread (id, work, agent, role, step, state, started, brief, said, model) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET state = excluded.state, said = excluded.said, model = excluded.model`,
        row.id,
        row.work,
        row.agent,
        row.role,
        row.step,
        row.state,
        row.started,
        row.brief,
        row.said,
        row.model,
      ),
    messages: (thread) =>
      sql
        .exec("SELECT json FROM message WHERE thread = ? ORDER BY n", thread)
        .toArray()
        .map((row) => parsed<Message>(row["json"])),
    addMessage: (thread, message) =>
      void sql.exec(
        "INSERT INTO message (thread, n, json) VALUES (?, (SELECT COALESCE(MAX(n), -1) + 1 FROM message WHERE thread = ?), ?)",
        thread,
        thread,
        JSON.stringify(message),
      ),
    addSpend: (spend: Spend) =>
      void sql.exec(
        "INSERT OR IGNORE INTO spend (call, work, thread, connection, model, input, cached, output, dollars, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        spend.call,
        spend.work,
        spend.thread,
        spend.connection,
        spend.model,
        spend.input,
        spend.cached,
        spend.output,
        spend.dollars ?? null,
        spend.at,
      ),
    spendOf: (work) => {
      const row = sql
        .exec("SELECT COALESCE(SUM(dollars), 0) AS dollars, COUNT(*) - COUNT(dollars) AS unknown FROM spend WHERE work = ?", work)
        .toArray()[0];
      return { dollars: Number(row?.["dollars"] ?? 0), notKnown: Number(row?.["unknown"] ?? 0) };
    },
    spends: () =>
      sql
        .exec("SELECT * FROM spend ORDER BY at")
        .toArray()
        .map((row): Spend => ({
          call: String(row["call"]),
          work: String(row["work"]),
          thread: String(row["thread"]),
          connection: String(row["connection"]),
          model: String(row["model"]),
          input: Number(row["input"]),
          cached: Number(row["cached"]),
          output: Number(row["output"]),
          ...(typeof row["dollars"] === "number" ? { dollars: row["dollars"] } : {}),
          at: Number(row["at"]),
        })),
    hold: (work) => {
      const row = sql.exec("SELECT why, retry FROM hold WHERE work = ?", work).toArray()[0];
      return row === undefined ? undefined : ({ why: String(row["why"]), retry: Number(row["retry"]) } satisfies Hold);
    },
    setHold: (work, hold) => {
      if (hold === null) sql.exec("DELETE FROM hold WHERE work = ?", work);
      else
        sql.exec(
          "INSERT INTO hold (work, why, retry) VALUES (?, ?, ?) ON CONFLICT (work) DO UPDATE SET why = excluded.why, retry = excluded.retry",
          work,
          hold.why,
          hold.retry,
        );
    },
    once: (key) => {
      const row = sql.exec("SELECT value FROM once WHERE key = ?", key).toArray()[0];
      return row === undefined ? undefined : String(row["value"]);
    },
    keepOnce: (key, value) => void sql.exec("INSERT OR IGNORE INTO once (key, value) VALUES (?, ?)", key, value),
    addActivity: (work, line) =>
      void sql.exec(
        "INSERT INTO activity (work, n, at, who, text) VALUES (?, (SELECT COALESCE(MAX(n), -1) + 1 FROM activity WHERE work = ?), ?, ?, ?)",
        work,
        work,
        line.at,
        line.who,
        line.text,
      ),
    activityOf: (work) =>
      sql
        .exec("SELECT at, who, text FROM activity WHERE work = ? ORDER BY n", work)
        .toArray()
        .map((row): ActivityLine => ({ who: String(row["who"]), at: Number(row["at"]), text: String(row["text"]) })),
    putAsk: (ask: Ask) =>
      void sql.exec(
        `INSERT INTO ask (id, seq, json) VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM ask), ?) ON CONFLICT (id) DO UPDATE SET json = excluded.json`,
        ask.id,
        JSON.stringify(ask),
      ),
    asks: () =>
      sql
        .exec("SELECT json FROM ask ORDER BY seq")
        .toArray()
        .map((row) => parsed<Ask>(row["json"])),
  };
}

import type { Lock, QueueEntry, StateAdapter } from "chat";
import type { Clock } from "~/modules/clock/types.ts";

/*
 * The SDK's StateAdapter over a Durable Object's SQLite: one table of keys, so subscriptions, locks, dedupe marks,
 * lists and queues survive an eviction. A Durable Object runs one thing at a time and SQL calls are synchronous, so
 * every read-then-write below is already atomic.
 */
type Row = { readonly value: string; readonly expires: number | null };

export function sqlState(sql: SqlStorage, clock: Clock): StateAdapter {
  sql.exec("CREATE TABLE IF NOT EXISTS chat_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires INTEGER)");
  const read = (key: string): unknown => {
    const row = sql.exec<Row>("SELECT value, expires FROM chat_state WHERE key = ?", key).toArray()[0];
    if (row === undefined) return null;
    if (row.expires !== null && row.expires <= clock.now()) {
      sql.exec("DELETE FROM chat_state WHERE key = ?", key);
      return null;
    }
    return JSON.parse(row.value) as unknown;
  };
  const write = (key: string, value: unknown, ttlMs?: number): void =>
    void sql.exec(
      "INSERT OR REPLACE INTO chat_state (key, value, expires) VALUES (?, ?, ?)",
      key,
      JSON.stringify(value),
      ttlMs === undefined ? null : clock.now() + ttlMs,
    );
  const remove = (key: string): void => void sql.exec("DELETE FROM chat_state WHERE key = ?", key);
  const array = <T>(key: string): T[] => (read(key) as T[] | null) ?? [];
  const held = (threadId: string): Lock | null => read(`lock:${threadId}`) as Lock | null;

  return {
    connect: async () => undefined,
    disconnect: async () => undefined,
    get: async <T>(key: string) => read(`kv:${key}`) as T | null,
    set: async (key, value, ttlMs) => write(`kv:${key}`, value, ttlMs),
    delete: async (key) => remove(`kv:${key}`),
    setIfNotExists: async (key, value, ttlMs) => {
      if (read(`kv:${key}`) !== null) return false;
      write(`kv:${key}`, value, ttlMs);
      return true;
    },
    subscribe: async (threadId) => write(`sub:${threadId}`, true),
    unsubscribe: async (threadId) => remove(`sub:${threadId}`),
    isSubscribed: async (threadId) => read(`sub:${threadId}`) !== null,
    acquireLock: async (threadId, ttlMs) => {
      if (held(threadId) !== null) return null;
      const lock: Lock = { threadId, token: crypto.randomUUID(), expiresAt: clock.now() + ttlMs };
      write(`lock:${threadId}`, lock, ttlMs);
      return lock;
    },
    extendLock: async (lock, ttlMs) => {
      if (held(lock.threadId)?.token !== lock.token) return false;
      write(`lock:${lock.threadId}`, { ...lock, expiresAt: clock.now() + ttlMs }, ttlMs);
      return true;
    },
    releaseLock: async (lock) => void (held(lock.threadId)?.token === lock.token && remove(`lock:${lock.threadId}`)),
    forceReleaseLock: async (threadId) => remove(`lock:${threadId}`),
    appendToList: async (key, value, options) => {
      const list = [...array(`list:${key}`), value];
      write(`list:${key}`, options?.maxLength === undefined ? list : list.slice(-options.maxLength), options?.ttlMs);
    },
    getList: async <T>(key: string) => array<T>(`list:${key}`),
    enqueue: async (threadId, entry, maxSize) => {
      const queue = [...array<QueueEntry>(`queue:${threadId}`), entry].slice(-maxSize);
      write(`queue:${threadId}`, queue);
      return queue.length;
    },
    dequeue: async (threadId) => {
      const [next, ...rest] = array<QueueEntry>(`queue:${threadId}`);
      write(`queue:${threadId}`, rest);
      return next ?? null;
    },
    queueDepth: async (threadId) => array(`queue:${threadId}`).length,
  };
}

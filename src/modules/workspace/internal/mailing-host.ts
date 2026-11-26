import type { Decision, Item } from "~/modules/intake/types.ts";
import type { ManagerRow } from "~/modules/console/types.ts";
import { createMailing } from "~/modules/mailing/service.ts";
import type { MailListener, MailStore, Mailing } from "~/modules/mailing/types.ts";
import type { MailRecord, Told } from "~/modules/mail-events/types.ts";
import { playbooks } from "~/modules/playbook/service.ts";
import type { WorkspaceDependencies } from "../types.ts";
import { runStore } from "./console-store.ts";

/* The workspace's mailbox in its own object: the mails kept, what became true of them and is not yet told, and small facts (who has a conversation, what was sent). */

export const MAILING_MIGRATIONS: readonly string[] = [
  `CREATE TABLE mail_record (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, json TEXT NOT NULL)`,
  `CREATE TABLE mail_news (id TEXT PRIMARY KEY, seq INTEGER NOT NULL, json TEXT NOT NULL, since INTEGER NOT NULL, told INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE mail_note (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];

const parsed = <T>(value: SqlStorageValue | undefined): T => JSON.parse(String(value)) as T;

export function mailStoreOver(sql: SqlStorage): MailStore {
  return {
    mails: () =>
      Object.fromEntries(
        sql
          .exec("SELECT id, json FROM mail_record ORDER BY seq")
          .toArray()
          .map((row) => [String(row["id"]), parsed<MailRecord>(row["json"])]),
      ),
    put: (mail) =>
      void sql.exec(
        "INSERT OR IGNORE INTO mail_record (id, seq, json) VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM mail_record), ?)",
        mail.id,
        JSON.stringify(mail),
      ),
    addNews: (news, since) => {
      for (const one of news)
        sql.exec(
          "INSERT OR IGNORE INTO mail_news (id, seq, json, since) VALUES (?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM mail_news), ?, ?)",
          one.key,
          JSON.stringify(one),
          since,
        );
    },
    news: () =>
      sql
        .exec("SELECT json, since FROM mail_news WHERE told = 0 ORDER BY seq")
        .toArray()
        .map((row) => ({ told: parsed<Told>(row["json"]), since: Number(row["since"]) })),
    told: (key) => void sql.exec("UPDATE mail_news SET told = 1 WHERE id = ?", key),
    note: (key) => {
      const row = sql.exec("SELECT value FROM mail_note WHERE key = ?", key).toArray()[0];
      return row === undefined ? undefined : String(row["value"]);
    },
    setNote: (key, value) =>
      void sql.exec("INSERT INTO mail_note (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", key, value),
  };
}

/** The managers that hear this mailbox: each as the mailbox needs it, reached through its own object. */
function listenersOver(sql: SqlStorage, deps: WorkspaceDependencies, mailbox: string): () => Promise<readonly MailListener[]> {
  return async () =>
    sql
      .exec("SELECT row FROM console_manager ORDER BY at, id")
      .toArray()
      .map((row) => parsed<ManagerRow>(row["row"]))
      .filter(({ hears }) => hears.some((place) => place.toLowerCase() === mailbox.toLowerCase()))
      .map((row): MailListener => {
        const store = deps.stores.get(row.objectId, row.region);
        return {
          manager: row.node.id,
          name: row.node.name,
          paused: row.node.state !== "runs",
          open: async () => (await store.hearing())?.open ?? [],
          news: (input) => store.news(input),
          waits: async () => {
            const hearing = await store.hearing();
            const read = hearing === undefined ? undefined : playbooks.read(hearing.version.files);
            if (read?._tag !== "Playbook") return [];
            return read.playbook.triggers.flatMap((one) =>
              one.on && one.by === "wait" && one.account === "email" ? [{ id: one.id, name: one.name, for: one.for }] : [],
            );
          },
        };
      });
}

/** What the mailbox keeps of who an address is: a person who signed in or proved it, or nobody. */
function personOf(sql: SqlStorage, address: string): string | null {
  const row = sql
    .exec(
      "SELECT person_id FROM handle WHERE kind = 'email' AND id = ? AND proof IN ('signed_in', 'verified')",
      address.trim().toLowerCase(),
    )
    .toArray()[0];
  return row === undefined ? null : String(row["person_id"]);
}

/** Keeps an item once, as every other thing that came in; `left` decides it at once, so that no judge and no person is asked about it. */
function keeperOver(
  sql: SqlStorage,
  deps: WorkspaceDependencies,
): (item: Omit<Item, "id" | "trigger">, trigger: string, hears: readonly string[], left: string | null) => boolean {
  return (item, trigger, hears, left) => {
    const answer = runStore({ sql, now: deps.clock.now(), id: deps.ids.next }, { op: "item.keep", item, trigger, hears });
    if (answer.op !== "item.keep") return false;
    if (answer.isNew && left !== null) {
      const decision: Decision = { _tag: "Left", item: answer.row.item.id, gated: [], verdicts: [], why: left };
      sql.exec("UPDATE console_item SET decision = ? WHERE id = ?", JSON.stringify(decision), answer.row.item.id);
    }
    return answer.isNew;
  };
}

function nameOf(sql: SqlStorage): string {
  const row = sql.exec("SELECT value FROM console_setting WHERE name = 'coworker.name'").toArray()[0];
  const name = row === undefined ? undefined : parsed<unknown>(row["value"]);
  return typeof name === "string" && name !== "" ? name : "Juno";
}

/** The mailbox of the workspace at this address (`<address>@<mail domain>`). */
export function mailingOf(sql: SqlStorage, deps: WorkspaceDependencies, address: string): Mailing {
  const mailbox = `${address}@${deps.mailDomain}`;
  return createMailing({
    store: mailStoreOver(sql),
    mailer: deps.mailer,
    clock: deps.clock,
    mailbox,
    addresses: [mailbox, deps.sendFrom],
    name: () => nameOf(sql),
    listeners: listenersOver(sql, deps, mailbox),
    keep: keeperOver(sql, deps),
    known: (address) => personOf(sql, address),
  });
}

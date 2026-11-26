import { KEEP_MS, type Arrived, type Box, type BoxDependencies, type Summary } from "../types.ts";

const TABLES = `
  CREATE TABLE IF NOT EXISTS letter (
    uid INTEGER PRIMARY KEY AUTOINCREMENT, message_id TEXT, in_reply_to TEXT, sender TEXT NOT NULL, subject TEXT NOT NULL,
    body TEXT NOT NULL, at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sent (id TEXT PRIMARY KEY, message_id TEXT, at INTEGER NOT NULL);
`;

type Row = {
  uid: number;
  message_id: string | null;
  in_reply_to: string | null;
  sender: string;
  subject: string;
  at: number;
};

const summary = (row: Row): Summary => ({
  uid: row.uid,
  messageId: row.message_id,
  inReplyTo: row.in_reply_to,
  from: row.sender,
  subject: row.subject,
  at: new Date(row.at).toISOString(),
});

function dropOld({ sql, clock }: BoxDependencies): void {
  const before = clock.now() - KEEP_MS;
  sql.exec("DELETE FROM letter WHERE at < ?", before);
  sql.exec("DELETE FROM sent WHERE at < ?", before);
}

function keep(deps: BoxDependencies, mail: Arrived): void {
  dropOld(deps);
  const { sql, clock } = deps;
  // A copy is one only if this box is waiting for it: anybody can write a header.
  if (mail.copyOf !== null && sql.exec("SELECT id FROM sent WHERE id = ?", mail.copyOf).toArray().length > 0) {
    sql.exec("UPDATE sent SET message_id = ? WHERE id = ? AND message_id IS NULL", mail.messageId, mail.copyOf);
    return;
  }
  sql.exec(
    "INSERT INTO letter (message_id, in_reply_to, sender, subject, body, at) VALUES (?, ?, ?, ?, ?, ?)",
    mail.messageId,
    mail.inReplyTo,
    mail.from,
    mail.subject,
    mail.text,
    clock.now(),
  );
}

export function openBox(deps: BoxDependencies): Box {
  const { sql, clock } = deps;
  sql.exec(TABLES);
  return {
    keep: async (mail) => keep(deps, mail),
    list: async (subject) => {
      dropOld(deps);
      return sql.exec<Row>("SELECT * FROM letter WHERE instr(subject, ?) > 0 ORDER BY uid DESC LIMIT 50", subject).toArray().map(summary);
    },
    read: async (uid) => {
      dropOld(deps);
      return sql.exec<{ body: string }>("SELECT body FROM letter WHERE uid = ?", uid).toArray()[0]?.body ?? null;
    },
    sending: async (id) => void sql.exec("INSERT INTO sent (id, at) VALUES (?, ?)", id, clock.now()),
    sent: async (id) =>
      sql.exec<{ message_id: string | null }>("SELECT message_id FROM sent WHERE id = ?", id).toArray()[0]?.message_id ?? null,
  };
}

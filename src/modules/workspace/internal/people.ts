import type { Actor, Handle, Proof } from "~/modules/triggers/types.ts";
import type { AddHandleResult, PersonHandles } from "../types.ts";

/*
 * People and their Handles (model.md "People and handles"). A Trigger's actor is found here by the platform's own
 * stable id. A member's sign-in email is their Handle without a row, since their person id is made from it.
 */

export const PEOPLE_MIGRATIONS: readonly string[] = [
  `CREATE TABLE handle (
     kind TEXT NOT NULL, space TEXT NOT NULL, id TEXT NOT NULL, person_id TEXT NOT NULL, display TEXT, proof TEXT NOT NULL,
     PRIMARY KEY (kind, space, id))`,
];

interface HandleRow extends Record<string, SqlStorageValue> {
  kind: string;
  space: string;
  id: string;
  person_id: string;
  display: string | null;
  proof: string;
}

const PROOFS: readonly Proof[] = ["signed_in", "verified", "added"];
const idOf = (kind: string, id: string): string => (kind === "email" ? id.trim().toLowerCase() : id);

const handleOf = (row: HandleRow): Handle => ({
  kind: row.kind,
  id: row.id,
  ...(row.space === "" ? {} : { space: row.space }),
  ...(row.display === null ? {} : { display: row.display }),
  proof: PROOFS.find((proof) => proof === row.proof) ?? "added",
});

/** Gives a Person a Handle. A Handle someone else holds moves only for proof they signed in with it. */
export function addHandle(sql: SqlStorage, person: string, handle: Handle): AddHandleResult {
  const [space, id] = [handle.space ?? "", idOf(handle.kind, handle.id)];
  const held = sql.exec<HandleRow>("SELECT * FROM handle WHERE kind = ? AND space = ? AND id = ?", handle.kind, space, id).toArray()[0];
  if (held !== undefined && held.person_id !== person && handle.proof !== "signed_in") return { _tag: "HeldByAnother" };
  sql.exec(
    `INSERT INTO handle (kind, space, id, person_id, display, proof) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (kind, space, id) DO UPDATE SET person_id = excluded.person_id, display = excluded.display, proof = excluded.proof`,
    handle.kind,
    space,
    id,
    person,
    handle.display ?? null,
    handle.proof,
  );
  return { _tag: "Added", handles: handlesOf(sql, person) };
}

export const handlesOf = (sql: SqlStorage, person: string): readonly Handle[] =>
  sql.exec<HandleRow>("SELECT * FROM handle WHERE person_id = ? ORDER BY kind, space, id", person).toArray().map(handleOf);

export function people(sql: SqlStorage): readonly PersonHandles[] {
  const byPerson = new Map<string, Handle[]>();
  for (const row of sql.exec<HandleRow>("SELECT * FROM handle ORDER BY person_id, kind, id").toArray()) {
    byPerson.set(row.person_id, [...(byPerson.get(row.person_id) ?? []), handleOf(row)]);
  }
  return [...byPerson].map(([person, handles]) => ({ person, handles }));
}

/** Who sent it: the Person holding the actor's Handle, or, for an email address nobody holds, the person it names. */
export function personFor(sql: SqlStorage, actor: Actor): string | undefined {
  const row = sql
    .exec<{ person_id: string }>(
      "SELECT person_id FROM handle WHERE kind = ? AND space = ? AND id = ?",
      actor.kind,
      actor.space ?? "",
      idOf(actor.kind, actor.id),
    )
    .toArray()[0];
  if (row !== undefined) return row.person_id;
  return actor.kind === "email" ? `email:${idOf("email", actor.id)}` : undefined;
}

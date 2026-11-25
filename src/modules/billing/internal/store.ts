import type { SpendLimit } from "../types.ts";

/** One row in the Workspace object. The Workspace runs this with its own migrations. */
export const BILLING_MIGRATIONS: readonly string[] = [
  `CREATE TABLE billing_account (
     only INTEGER PRIMARY KEY CHECK (only = 1), period_start INTEGER NOT NULL, seats INTEGER NOT NULL,
     next_seats INTEGER NOT NULL, limit_on INTEGER NOT NULL, limit_cents INTEGER NOT NULL)`,
];

export interface AccountRow {
  readonly periodStart: number;
  readonly seats: number;
  readonly nextSeats: number;
  readonly limit: SpendLimit;
}

export const DEFAULT_LIMIT: SpendLimit = { on: true, overCents: 5_000 };

export function readAccount(sql: SqlStorage): AccountRow | undefined {
  const row = sql
    .exec<{ period_start: number; seats: number; next_seats: number; limit_on: number; limit_cents: number }>(
      "SELECT * FROM billing_account",
    )
    .toArray()[0];
  if (row === undefined) return undefined;
  return {
    periodStart: row.period_start,
    seats: row.seats,
    nextSeats: row.next_seats,
    limit: { on: row.limit_on === 1, overCents: row.limit_cents },
  };
}

export function writeAccount(sql: SqlStorage, account: AccountRow): void {
  sql.exec(
    "INSERT OR REPLACE INTO billing_account (only, period_start, seats, next_seats, limit_on, limit_cents) VALUES (1, ?, ?, ?, ?, ?)",
    account.periodStart,
    account.seats,
    account.nextSeats,
    account.limit.on ? 1 : 0,
    account.limit.overCents,
  );
}

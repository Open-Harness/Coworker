import { DEFAULT_LIMIT, readAccount, writeAccount, type AccountRow } from "./internal/store.ts";
import type { Account, AccountDependencies, Billing, BillingView, Plan, SpendLimit } from "./types.ts";

export { BILLING_MIGRATIONS } from "./internal/store.ts";

/** The Billing screen's plan: $20 a seat each month, 10 sandbox hours a seat, then $0.80 an hour. */
export const TEAM_PLAN: Plan = { name: "Team", seatCents: 2_000, includedHoursPerSeat: 10, overageCentsPerHour: 80 };

const HOUR = 3_600;

/** The same day next month, or the month's last day when it has fewer. */
export function nextMonth(at: number): number {
  const date = new Date(at);
  const [year, month, day] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(day, last), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
}

/** Periods that ended while nobody looked: each renewal bills the seats left at it. */
function current(dependencies: AccountDependencies): AccountRow {
  const { sql, clock, since } = dependencies;
  const stored = readAccount(sql);
  let account = stored ?? { periodStart: since, seats: 1, nextSeats: 1, limit: DEFAULT_LIMIT };
  while (nextMonth(account.periodStart) <= clock.now()) {
    account = { ...account, periodStart: nextMonth(account.periodStart), seats: account.nextSeats };
  }
  if (account !== stored) writeAccount(sql, account);
  return account;
}

const round = (hours: number): number => Math.round(hours * 100) / 100;

function viewOf(account: AccountRow, usedSeconds: number, plan: Plan = TEAM_PLAN): BillingView {
  const included = account.seats * plan.includedHoursPerSeat;
  const used = usedSeconds / HOUR;
  const over = Math.max(0, used - included);
  const overageCents = Math.round(over * plan.overageCentsPerHour);
  return {
    plan,
    seats: account.seats,
    nextSeats: account.nextSeats,
    periodStart: account.periodStart,
    renewsAt: nextMonth(account.periodStart),
    hours: { used: round(used), included, over: round(over) },
    overageCents,
    limit: account.limit,
    stopped: account.limit.on && overageCents >= account.limit.overCents,
  };
}

export const limitOf = (value: unknown): SpendLimit | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const { on, overCents } = value as Record<string, unknown>;
  if (typeof on !== "boolean" || typeof overCents !== "number" || !Number.isSafeInteger(overCents) || overCents < 0) return undefined;
  return { on, overCents };
};

/** Opened per call: everything it knows is in the Workspace object's table and the sandboxes' meter. */
export function openAccount(dependencies: AccountDependencies): Account {
  const { sql, billing, workspaceId } = dependencies;
  const view = (used: (since: number) => number) => {
    const account = current(dependencies);
    return viewOf(account, used(account.periodStart));
  };
  return {
    view,
    setLimit: (limit, used) => {
      writeAccount(sql, { ...current(dependencies), limit });
      return view(used);
    },
    membersChanged: async (members, used) => {
      const account = current(dependencies);
      const seats = Math.max(1, members);
      const from = seats > account.seats ? "now" : "renewal";
      writeAccount(sql, { ...account, seats: Math.max(account.seats, seats), nextSeats: seats });
      await billing.seats({ workspaceId, seats, from });
      return view(used);
    },
    metered: async ({ key, seconds, before }) => {
      const included = current(dependencies).seats * TEAM_PLAN.includedHoursPerSeat * HOUR;
      const over = Math.max(0, before + seconds - included) - Math.max(0, before - included);
      if (over > 0) await billing.overage({ workspaceId, key, hours: over / HOUR });
    },
  };
}

/** Until Stripe is set up (book section 3): nothing is charged, and the screen still counts. */
export const unbilled: Billing = { seats: async () => undefined, overage: async () => undefined };

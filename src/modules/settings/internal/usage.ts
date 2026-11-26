import type { By } from "~/modules/actions/types.ts";
import type { BudgetView, SettingsApi, SettingsPlace, UsageView, WhenReached } from "../types.ts";
import { said } from "./said.ts";

/*
 * What a workspace used, and the limits on it. Sandbox time is what the workspace meters, so a manager's budget is in
 * sandbox hours of the billing period: at 80% and again at 100% its owner gets a notice, and a budget that says stop
 * refuses the manager's next command. Model spend is on the workspace's own keys and is not metered here.
 */

const HOUR = 3_600;
const ALERTS = [80, 100] as const;

export function budgetOf(place: SettingsPlace, managerId: string): BudgetView | null {
  const row = place.sql
    .exec<{ hours: number; when_reached: string }>("SELECT * FROM manager_budget WHERE manager_id = ?", managerId)
    .toArray()[0];
  return row === undefined ? null : { hours: row.hours, whenReached: row.when_reached === "stop" ? "stop" : "tell" };
}

const previousMonth = (at: number): number => {
  const date = new Date(at);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.getTime();
};

const round = (hours: number): number => Math.round(hours * 100) / 100;

export async function usage(place: SettingsPlace): Promise<UsageView> {
  const billing = place.account.view(place.sandboxes.used);
  const since = billing.periodStart;
  const bySeconds = place.sandboxes.usedByManager(since);
  const last = previousMonth(since);
  const managers = await Promise.all(
    place.roster.map(async (entry) => {
      const api = place.manager(entry);
      const [now, before] = await Promise.all([api.runCount(since), api.runCount(last, since)]);
      return {
        managerId: entry.managerId,
        name: entry.name,
        sandboxHours: round((bySeconds[entry.managerId] ?? 0) / HOUR),
        runs: now,
        budget: budgetOf(place, entry.managerId),
        before,
      };
    }),
  );
  return {
    periodStart: since,
    renewsAt: billing.renewsAt,
    sandbox: { hours: billing.hours, overageCents: billing.overageCents },
    perDay: place.sandboxes.usedByDay(since).map(({ day, seconds }) => ({ day, hours: round(seconds / HOUR) })),
    managers: managers.map(({ before: _before, ...rest }) => rest),
    runs: {
      thisPeriod: managers.reduce((sum, { runs }) => sum + runs, 0),
      lastPeriod: managers.reduce((sum, { before }) => sum + before, 0),
    },
  };
}

export async function setBudget(place: SettingsPlace, input: Parameters<SettingsApi["setBudget"]>[0], by: By) {
  const entry = place.roster.find(({ managerId }) => managerId === input.managerId);
  if (entry === undefined) return { _tag: "NotFound" } as const;
  const { budget } = input;
  if (budget === null) {
    place.sql.exec("DELETE FROM manager_budget WHERE manager_id = ?", entry.managerId);
    said(place, by, "settings.budget", `${by.name} removed the sandbox budget of ${entry.name}`, entry.managerId);
  } else {
    const whens: readonly WhenReached[] = ["stop", "tell"];
    if (!Number.isFinite(budget.hours) || budget.hours <= 0 || budget.hours > 10_000)
      return { _tag: "Invalid", reason: "A budget is more than 0 and at most 10,000 sandbox hours" } as const;
    if (!whens.includes(budget.whenReached)) return { _tag: "Invalid", reason: "When reached: stop or tell" } as const;
    place.sql.exec(
      "INSERT INTO manager_budget (manager_id, hours, when_reached) VALUES (?, ?, ?) ON CONFLICT (manager_id) DO UPDATE SET hours = excluded.hours, when_reached = excluded.when_reached",
      entry.managerId,
      budget.hours,
      budget.whenReached,
    );
    said(
      place,
      by,
      "settings.budget",
      `${by.name} set the sandbox budget of ${entry.name} to ${budget.hours} hours (${budget.whenReached} when reached)`,
      entry.managerId,
    );
  }
  return { _tag: "Saved", value: await usage(place) } as const;
}

const hoursUsed = (place: SettingsPlace, managerId: string): { readonly hours: number; readonly since: number } => {
  const { periodStart } = place.account.view(place.sandboxes.used);
  return { hours: (place.sandboxes.usedByManager(periodStart)[managerId] ?? 0) / HOUR, since: periodStart };
};

/** Why a manager may not start a sandbox command now: its budget says stop and is used up. */
export function blocked(place: SettingsPlace, managerId: string): string | undefined {
  const budget = budgetOf(place, managerId);
  if (budget === null || budget.whenReached !== "stop") return undefined;
  return hoursUsed(place, managerId).hours >= budget.hours
    ? `This manager's sandbox budget of ${budget.hours} hours is used up for this period`
    : undefined;
}

/** After a command: tell the manager's owner once per period and level that the budget is nearly or fully used. */
export function alertAfter(place: SettingsPlace, managerId: string): void {
  const budget = budgetOf(place, managerId);
  const owner = place.ownerOf(managerId);
  const name = place.roster.find((entry) => entry.managerId === managerId)?.name;
  if (budget === null || owner === undefined || name === undefined) return;
  const { hours, since } = hoursUsed(place, managerId);
  for (const level of ALERTS) {
    if (hours < (budget.hours * level) / 100) continue;
    const used = `${round(hours)} of its ${budget.hours} sandbox hours`;
    const title =
      level === 100 ? `${name} has used all of its sandbox budget: ${used}` : `${name} has used ${level}% of its sandbox budget: ${used}`;
    place.notice({ id: `budget:${managerId}:${since}:${level}`, to: owner, title });
  }
}

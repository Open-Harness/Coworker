import type { Clock } from "~/modules/clock/types.ts";

/*
 * What a workspace pays (the Billing screen): seats each month, and sandbox hours past what the seats include. The
 * plan's arithmetic is ours; charging is Stripe's, behind `Billing`.
 */

export interface Plan {
  readonly name: string;
  /** Per seat, each month. */
  readonly seatCents: number;
  readonly includedHoursPerSeat: number;
  readonly overageCentsPerHour: number;
}

/** "Stop sandboxes at $50 over plan." */
export interface SpendLimit {
  readonly on: boolean;
  readonly overCents: number;
}

export interface BillingView {
  readonly plan: Plan;
  /** Billed this period. */
  readonly seats: number;
  /** Billed from the renewal: fewer when someone left. */
  readonly nextSeats: number;
  readonly periodStart: number;
  readonly renewsAt: number;
  readonly hours: { readonly used: number; readonly included: number; readonly over: number };
  readonly overageCents: number;
  readonly limit: SpendLimit;
  /** The limit is reached: no sandbox starts until the renewal or a higher limit. */
  readonly stopped: boolean;
}

/** The outside thing: Stripe test mode on staging, a recorder in the fast tier. */
export interface Billing {
  /** An added seat is billed now, prorated; a removed one stops at the renewal. */
  readonly seats: (input: { readonly workspaceId: string; readonly seats: number; readonly from: "now" | "renewal" }) => Promise<void>;
  /** Hours past the plan, once per `key`. */
  readonly overage: (input: { readonly workspaceId: string; readonly key: string; readonly hours: number }) => Promise<void>;
}

export interface AccountDependencies {
  /** The Workspace object's own storage. */
  readonly sql: SqlStorage;
  readonly billing: Billing;
  readonly clock: Clock;
  readonly workspaceId: string;
  /** When the workspace was made: the first period starts then. */
  readonly since: number;
}

/** One workspace's account. `used` is the sandbox seconds since a time, from the sandboxes' meter. */
export interface Account {
  readonly view: (used: (since: number) => number) => BillingView;
  readonly setLimit: (limit: SpendLimit, used: (since: number) => number) => BillingView;
  /** After someone joined or left: `members` is how many there are now. */
  readonly membersChanged: (members: number, used: (since: number) => number) => Promise<BillingView>;
  /** Sends the part of a command's seconds that went past the plan. `before` is the period's seconds before it. */
  readonly metered: (input: { readonly key: string; readonly seconds: number; readonly before: number }) => Promise<void>;
}

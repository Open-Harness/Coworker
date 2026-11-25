import type { Billing } from "./types.ts";

export interface FakeBilling extends Billing {
  readonly seatChanges: { readonly workspaceId: string; readonly seats: number; readonly from: "now" | "renewal" }[];
  readonly overages: { readonly workspaceId: string; readonly key: string; readonly hours: number }[];
  /** The overage hours a workspace was charged, each key once. */
  readonly hoursOf: (workspaceId: string) => number;
}

/** The fast tier's Stripe: records seats and metered hours. */
export function fakeBilling(): FakeBilling {
  const seatChanges: FakeBilling["seatChanges"] = [];
  const overages: FakeBilling["overages"] = [];
  return {
    seatChanges,
    overages,
    seats: async (input) => void seatChanges.push(input),
    overage: async (input) => {
      if (!overages.some(({ key }) => key === input.key)) overages.push(input);
    },
    hoursOf: (workspaceId) => overages.filter((line) => line.workspaceId === workspaceId).reduce((sum, { hours }) => sum + hours, 0),
  };
}

/** One fake for the Worker and the tests in one isolate. */
export const billingWorld: FakeBilling = fakeBilling();

import type { ActionId, Grant, Permission, Reach } from "../types.ts";

const rank: Readonly<Record<Permission, number>> = { off: 0, ask: 1, on: 2 };

/** The lower of two permissions. */
export function lower(a: Permission, b: Permission): Permission {
  return rank[a] <= rank[b] ? a : b;
}

export function stronger(a: Permission, b: Permission): boolean {
  return rank[a] > rank[b];
}

/** A grant for `*` counts for every place of its account; one for a place, for that place only. */
export function covers(grant: Grant, account: string, place: string): boolean {
  return grant.account === account && (grant.place === "*" || grant.place === place);
}

/** What `reach` allows for an action, in a place: the strongest of the grants that cover it. Not listed is off. */
export function permissionIn(reach: Reach, account: string, place: string, action: ActionId): Permission {
  let found: Permission = "off";
  for (const grant of reach.grants) {
    if (!covers(grant, account, place)) continue;
    const may = grant.may[action] ?? "off";
    if (stronger(may, found)) found = may;
  }
  return found;
}

export function hasAccount(reach: Reach, account: string): boolean {
  return reach.grants.some((grant) => grant.account === account);
}

export function coversPlace(reach: Reach, account: string, place: string): boolean {
  return reach.grants.some((grant) => covers(grant, account, place));
}

/** Where a grant is, in words. */
export function whereOf(grant: Pick<Grant, "account" | "place">): string {
  return grant.place === "*" ? `every place (*) of ${grant.account}` : `${grant.place} of ${grant.account}`;
}

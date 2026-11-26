import type { ActionId, Grant, Limits, Permission, Reach } from "~/modules/reach/types.ts";
import { reaches } from "~/modules/reach/service.ts";

const rank: Readonly<Record<Permission, number>> = { off: 0, ask: 1, on: 2 };

function lower(a: Permission, b: Permission): Permission {
  return rank[a] <= rank[b] ? a : b;
}

/** What `reach` allows an action in a place: the strongest grant that covers it. */
function permissionIn(reach: Reach, account: string, place: string, action: ActionId): Permission {
  let found: Permission = "off";
  for (const grant of reach.grants) {
    if (grant.account !== account || (grant.place !== "*" && grant.place !== place)) continue;
    const may = grant.may[action] ?? "off";
    if (rank[may] > rank[found]) found = may;
  }
  return found;
}

/** The places a grant can count in once cut to `whole`: its own, or for `*`, each place the whole has for the account. */
function placesOf(grant: Grant, whole: Reach): readonly string[] {
  if (grant.place !== "*") return [grant.place];
  const places = whole.grants.filter((one) => one.account === grant.account).map((one) => one.place);
  return [...new Set(places)];
}

function cutGrants(part: Reach, whole: Reach): readonly Grant[] {
  const out: Grant[] = [];
  for (const grant of part.grants) {
    for (const place of placesOf(grant, whole)) {
      const may: Record<ActionId, Permission> = {};
      for (const [action, had] of Object.entries(grant.may)) {
        const now = lower(had, permissionIn(whole, grant.account, place, action));
        if (now !== "off") may[action] = now;
      }
      if (Object.keys(may).length > 0) out.push({ account: grant.account, place, may });
    }
  }
  return out;
}

const limitKeys = ["perWork", "perDay", "perMonth", "hours", "atOnce"] as const;

/** Each limit the part has, lowered to the whole's. One it did not have stays absent. */
function cutLimits(part: Limits, whole: Limits): Limits {
  const out: Record<string, number> = {};
  for (const key of limitKeys) {
    const mine = part[key];
    const above = whole[key];
    if (mine !== undefined) out[key] = above !== undefined && mine > above ? above : mine;
  }
  return out;
}

/** `part` as a part of `whole`, never more than it was. Untouched, when it already fits. */
export function cut(whole: Reach, part: Reach): Reach {
  if (reaches.wider(whole, part).length === 0) return part;
  return { grants: cutGrants(part, whole), limits: cutLimits(part.limits, whole.limits) };
}

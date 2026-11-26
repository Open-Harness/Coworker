import type { ActionId, Allowed, Grant, Mandate, Permission, Reach, Spent, Use, Wider } from "../types.ts";
import { covers, coversPlace, hasAccount, lower, permissionIn, stronger, whereOf } from "./grants.ts";
import { limitKeys, limitName, lowest, reached } from "./limits.ts";

type Given = Pick<Mandate, "strength" | "because" | "version" | "until">;

/** `part` cut to `whole`, and each cut said once. */
export function mandate(whole: Reach, part: Reach, given: Given): { readonly mandate: Mandate; readonly leftOut: Wider } {
  const leftOut: string[] = [];
  const grants: Grant[] = [];
  for (const grant of part.grants) {
    if (!hasAccount(whole, grant.account)) {
      leftOut.push(`The account ${grant.account} is not in the reach above, so it is left out.`);
      continue;
    }
    if (!coversPlace(whole, grant.account, grant.place)) {
      leftOut.push(`${whereOf(grant)} is not in the reach above, so it is left out.`);
      continue;
    }
    const may: Record<ActionId, Permission> = {};
    for (const [action, asked] of Object.entries(grant.may)) {
      if (asked === "off") continue;
      const above = permissionIn(whole, grant.account, grant.place, action);
      if (stronger(asked, above))
        leftOut.push(
          above === "off"
            ? `${action} is not allowed above, so it is left out.`
            : `${action} was asked as ${asked}, and is ${above} above, so it is ${above}.`,
        );
      if (above !== "off") may[action] = lower(asked, above);
    }
    if (Object.keys(may).length > 0) grants.push({ account: grant.account, place: grant.place, may });
  }
  const limits: Record<string, number> = {};
  for (const key of limitKeys) {
    const asked = part.limits[key];
    const above = whole.limits[key];
    if (asked !== undefined && above !== undefined && asked > above)
      leftOut.push(`The limit ${limitName(key)} was asked as ${asked}, and is ${above} above, so it is ${above}.`);
    const value = asked === undefined ? above : above === undefined ? asked : Math.min(asked, above);
    if (value !== undefined) limits[key] = value;
  }
  const made: Mandate = {
    grants,
    limits,
    strength: given.strength,
    because: given.because,
    version: given.version,
    ...(given.until === undefined ? {} : { until: given.until }),
    state: "holds",
  };
  return { mandate: made, leftOut };
}

/** The reach above changed: what is still there, never more than it was. */
export function narrow(made: Mandate, whole: Reach): Mandate {
  if (made.state !== "holds") return made;
  const grants: Grant[] = [];
  for (const grant of made.grants) {
    const may: Record<ActionId, Permission> = {};
    for (const [action, had] of Object.entries(grant.may)) {
      const now = lower(had, permissionIn(whole, grant.account, grant.place, action));
      if (now !== "off") may[action] = now;
    }
    if (Object.keys(may).length > 0) grants.push({ account: grant.account, place: grant.place, may });
  }
  const gone = made.grants.length > 0 && grants.length === 0;
  return { ...made, grants, limits: lowest(made.limits, whole.limits), ...(gone ? { state: "taken back" as const } : {}) };
}

/** May this be done, now. */
export function allowed(made: Mandate, use: Use, spent: Spent): Allowed {
  if (made.state === "stopped") return { is: "off", why: "The work was stopped, so it may do nothing more." };
  if (made.state === "taken back") return { is: "off", why: "Its mandate was taken back, so it may do nothing more." };
  if (made.until !== undefined && use.at > made.until) return { is: "off", why: "Its mandate ran out of time." };
  const grant = made.grants.find((one) => covers(one, use.account, use.place));
  const is = grant?.may[use.action] ?? "off";
  if (is === "off")
    return { is: "off", why: grant ? `${use.action} is not allowed here.` : `${use.place} of ${use.account} is not in its mandate.` };
  const limitsReached = reached(made.limits, spent);
  if (limitsReached.length > 0) return { is: "ask", why: `${limitsReached.join(" ")} So it asks.` };
  return { is, why: is === "on" ? `${use.action} is allowed.` : `${use.action} is allowed when someone says yes.` };
}

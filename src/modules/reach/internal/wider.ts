import type { Reach, Wider } from "../types.ts";
import { coversPlace, hasAccount, permissionIn, stronger, whereOf } from "./grants.ts";
import { limitName, widerLimits } from "./limits.ts";

/** Everything of `part` that is not in `whole`, one sentence each. */
export function wider(whole: Reach, part: Reach): Wider {
  const said: string[] = [];
  for (const grant of part.grants) {
    const asks = Object.entries(grant.may).filter(([, may]) => may !== "off");
    if (asks.length === 0) continue;
    if (!hasAccount(whole, grant.account)) {
      said.push(`The account ${grant.account} is not in the reach above.`);
      continue;
    }
    if (!coversPlace(whole, grant.account, grant.place)) {
      said.push(`${whereOf(grant)} is not in the reach above.`);
      continue;
    }
    for (const [action, may] of asks) {
      const above = permissionIn(whole, grant.account, grant.place, action);
      if (stronger(may, above)) said.push(`${action} is ${may} in ${whereOf(grant)}, and ${above} above.`);
    }
  }
  for (const key of widerLimits(whole.limits, part.limits))
    said.push(`The limit ${limitName(key)} is ${part.limits[key]}, more than ${whole.limits[key]} above.`);
  return said;
}

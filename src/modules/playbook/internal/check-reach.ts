import type { Grant, Reach } from "~/modules/reach/types.ts";
import { reaches } from "~/modules/reach/service.ts";
import type { Ctx } from "./check-context.ts";
import { checkAccount } from "./check-context.ts";

/** The grants whose account is there, with only the actions it has: what is left can be compared with the reach above. */
export function knownGrants(c: Ctx, grants: readonly Grant[]): readonly Grant[] {
  return grants.flatMap((g) => {
    const account = c.account(g.account);
    if (account === undefined) return [];
    return [{ ...g, may: Object.fromEntries(Object.entries(g.may).filter(([action]) => account.actions.includes(action))) }];
  });
}

/** What of `part` is wider than the reach above, said at its line. Grants and limits are looked at apart so each says where. */
export function checkWider(c: Ctx, at: string, line: string, part: Reach, limitsLine = line): void {
  for (const grant of part.grants) for (const why of reaches.wider(c.around.above, { grants: [grant], limits: {} })) c.say(at, line, why);
  for (const why of reaches.wider(c.around.above, { grants: [], limits: part.limits })) c.say(at, limitsLine, why);
}

export function checkReach(c: Ctx): void {
  const r = c.p.reach;
  for (const g of r.grants) {
    const line = `reach/${g.account}/${g.place}`;
    if (checkAccount(c, "reach.yaml", line, g.account, `The grant for ${g.place}`)) {
      const known = c.account(g.account)?.actions ?? [];
      for (const action of Object.keys(g.may))
        if (!known.includes(action)) c.say("reach.yaml", line, `The grant for ${g.place} allows ${action}, which ${g.account} has not.`);
    }
    checkWider(c, "reach.yaml", line, { grants: knownGrants(c, [g]), limits: {} });
  }
  checkWider(c, "reach.yaml", "reach/limits", { grants: [], limits: r.limits });
  for (const rule of r.mayAsk) {
    const line = `reach/mayAsk/${rule.account}/${rule.place}`;
    checkAccount(c, "reach.yaml", line, rule.account, `The rule of who may ask in ${rule.place}`);
    if (Array.isArray(rule.listed.who))
      for (const who of rule.listed.who)
        if (!c.people.has(who)) c.say("reach.yaml", line, `${who} may ask in ${rule.place}, but is not one of the people here.`);
  }
}

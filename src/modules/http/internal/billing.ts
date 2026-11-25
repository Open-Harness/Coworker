import type { SignedIn } from "~/modules/auth/types.ts";
import { limitOf } from "~/modules/billing/service.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";

/** `/api/workspaces/<id>/billing[/limit]`: the Billing screen. Settings, so the Owner preset. */
export const BILLING = /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/billing(\/limit)?$/u;

const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });
const answer = (result: object): Response => Response.json(result, { headers: { "Cache-Control": "no-store" } });

export async function routeBilling(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  matched: RegExpExecArray,
): Promise<Response> {
  const [, workspaceId = "", limit] = matched;
  const reached = await workspaces.reach(person.userId, workspaceId, "settings");
  if (reached._tag === "NotMember") return problem(404, "No such workspace");
  if (reached._tag === "NotOwner") return problem(403, "Only an Owner sees and changes billing");
  if (limit === undefined) return request.method === "GET" ? answer({ billing: await reached.object.billing() }) : problem(405, "Use GET");
  if (request.method !== "PUT") return problem(405, "Use PUT");
  const sent = limitOf(await request.json().catch(() => undefined));
  if (sent === undefined) return problem(400, "Send on (true or false) and overCents, a whole number of cents");
  const result = await reached.object.setSpendLimit(sent);
  return result._tag === "NotProvisioned" ? problem(404, "No such workspace") : answer(result);
}

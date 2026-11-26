import type { SignedIn } from "~/modules/auth/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { closed, fresh, problem, reach, said, settings } from "./kit.ts";

/** `email` and `email/test`: the workspace-wide screens of how its managers are reached by mail. */
export async function routeWorkspaceLevel(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  part: string,
): Promise<Response | undefined> {
  const reached = await reach(workspaces, person, workspaceId, "member", "");
  if (reached instanceof Response) return reached;
  const { object, role } = reached;
  if (part === "email" && request.method === "GET") {
    const refused = await closed(object, person, role, "manager-settings");
    if (refused !== undefined) return refused;
    const general = await settings(object, person, "general", null);
    if (general instanceof Response) return general;
    const addresses = (await object.managers()).map(({ managerId, name, address }) => ({
      managerId,
      name,
      address,
      taskAddress: address.replace("@", "+dt-<number>@"),
      how: "Our domain, nothing to set up",
      status: "Live",
    }));
    return fresh({ ending: `.${general.address}@${general.mailDomain}`, addresses });
  }
  if (part !== "email/test" || request.method !== "POST") return undefined;
  if (role === "member") return problem(403, "Only Owners and Builders send a test mail");
  const body: unknown = await request.json().catch(() => undefined);
  const managerId =
    typeof body === "object" && body !== null && "managerId" in body && typeof body.managerId === "string" ? body.managerId : undefined;
  if (managerId === undefined) return problem(400, "Send managerId");
  const sent = await settings(object, person, "testMail", { managerId, to: person.email });
  return sent instanceof Response ? sent : said(sent);
}

import { json } from "./flows.ts";
import { member, type Team } from "./team.ts";

/** Someone who joined by the invite link and was then made a Builder by the Owner, through Better Auth's own route. */
export async function builder(launch: Team, email: string, name: string) {
  const person = await member(launch, email, name);
  const workspaceId = launch.workspace.split("/").at(-1) ?? "";
  const listed = await json<{ members: readonly { id: string; user: { email: string } }[] }>(
    await launch.owner.send("GET", `/api/auth/organization/list-members?organizationId=${workspaceId}&limit=100`),
  );
  const memberId = listed.members.find(({ user }) => user.email === email)?.id;
  const changed = await launch.owner.send("POST", "/api/auth/organization/update-member-role", {
    organizationId: workspaceId,
    memberId,
    role: "builder",
  });
  if (!changed.ok) throw new Error(`Making a Builder failed: ${changed.status}`);
  return person;
}

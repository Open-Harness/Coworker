import { mayOpen } from "~/modules/access/service.ts";
import type { Standing } from "~/modules/access/types.ts";
import type { Auth, SignedIn } from "~/modules/auth/types.ts";
import type { ManagerObjects } from "~/modules/manager/types.ts";
import { personOf } from "~/modules/protocol/service.ts";
import { search } from "~/modules/search/service.ts";
import type { Searchable, SearchHit } from "~/modules/search/types.ts";
import type { ManagerEntry, PersonHandles } from "~/modules/workspace/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { ownOf } from "./kit.ts";

/** `/api/workspaces/<id>/search?q=`: what the person may see of the workspace's pages, tasks, managers and people. */
export const SEARCH = /^\/api\/workspaces\/([A-Za-z0-9_-]{8,64})\/search$/u;

const problem = (status: number, message: string): Response => Response.json({ error: message }, { status });

/** A manager is found by its name and its address. */
const managerItem = ({ managerId, name, address }: ManagerEntry): Searchable => ({
  kind: "manager",
  id: managerId,
  managerId,
  title: name,
  body: address,
});

type Member = Awaited<ReturnType<Auth["membersOf"]>>[number];

/** Members by name and sign-in address, then people only known by a handle, as the People page lists them. */
function peopleItems(members: readonly Member[], known: readonly PersonHandles[]): readonly Searchable[] {
  const handlesOf = (id: string): string =>
    (known.find(({ person }) => person === id)?.handles ?? []).map(({ display, id: handle }) => `${display ?? ""} ${handle}`).join(" ");
  const named = members.map((member): Searchable => {
    const { id, name } = personOf(member);
    return { kind: "person", id, managerId: "", title: name, body: `${member.email} ${handlesOf(id)}` };
  });
  const others = known
    .filter(({ person }) => !named.some(({ id }) => id === person))
    // The People page names them by their address, so that is the title; what they are called elsewhere is found too.
    .map(({ person }): Searchable => ({
      kind: "person",
      id: person,
      managerId: "",
      title: person.replace(/^email:/u, ""),
      body: handlesOf(person),
    }));
  return [...named, ...others];
}

/** A hit is shown to whoever may open its page: what the pages refuse, search does not tell. */
const visible = (standing: Standing) => {
  const may = { page: mayOpen(standing, "mission"), task: mayOpen(standing, "task") };
  return (hit: SearchHit): boolean => (hit.kind === "page" ? may.page : hit.kind === "task" ? may.task : true);
};

export async function routeSearch(
  auth: Auth,
  workspaces: Workspaces,
  managers: ManagerObjects,
  person: SignedIn,
  request: Request,
  workspaceId: string,
): Promise<Response> {
  if (request.method !== "GET") return problem(405, "Use GET");
  const reached = await workspaces.reach(person.userId, workspaceId, "member");
  if (reached._tag !== "Reached") return problem(404, "No such workspace");
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const entries = await reached.object.managers();
  const [inside, members, known] = await Promise.all([
    Promise.all(entries.map((entry) => managers.get(entry.objectId, entry.region).search(query))),
    auth.membersOf(workspaceId),
    reached.object.people(),
  ]);
  const see = visible({ role: reached.role, own: await ownOf(reached.object, person) });
  const lists = [
    ...inside.map((hits) => hits.filter(see)),
    search.find([...entries.map(managerItem), ...peopleItems(members, known)], query),
  ];
  return Response.json({ hits: search.merge(lists) }, { headers: { "Cache-Control": "no-store" } });
}

import { arrayOf, each, isRecord, teamLinks, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { Json, Loaded, Server } from "~/modules/team-core/types.ts";
import { createSettingsApi } from "~/modules/team-settings/service.ts";
import type { Hearing, Made, ManagerAt, StartApi, Task } from "../types.ts";

const done = (): true => true;
const base = (workspaceId: string): string => `/api/workspaces/${encodeURIComponent(workspaceId)}`;
const managerAt = (workspaceId: string, managerId: string): string => `${base(workspaceId)}/managers/${encodeURIComponent(managerId)}`;

const manager = (row: Json): ManagerAt | undefined =>
  typeof row["managerId"] === "string"
    ? { managerId: row["managerId"], name: textOf(row["name"], row["managerId"]), address: textOf(row["address"]) }
    : undefined;

const words = (value: unknown): readonly string[] => arrayOf(value).flatMap((entry) => wordsOf(entry) ?? []);

/** `{github: {installation?, sources}}`, for one manager. */
function hearing(managerId: string) {
  return (body: unknown): Hearing | undefined => {
    if (!isRecord(body) || !isRecord(body["github"])) return undefined;
    const { installation, sources } = body["github"];
    const heard = each(sources, (source) => (source["managerId"] === managerId ? wordsOf(source["repo"]) : undefined));
    return { repos: isRecord(installation) ? words(installation["repos"]) : [], heard };
  };
}

/** A question a manager asked this person, that has been answered. A request to join comes from no manager. */
const isAnswered = (item: Json): true | undefined =>
  item["kind"] === "question" && wordsOf(item["managerId"]) !== undefined && isRecord(item["answer"]) ? true : undefined;
const questions = (body: unknown): number | undefined => (isRecord(body) ? each(body["items"], isAnswered).length : undefined);

export function createStartApi(server: Server): StartApi {
  const { read, write } = server;
  const settings = createSettingsApi(server);
  const managers: StartApi["managers"] = (id) =>
    read(`${base(id)}/managers`, (body) => (isRecord(body) ? each(body["managers"], manager) : undefined));

  const progress = async (id: string): Promise<Loaded<readonly Task[]>> => {
    const [keys, list, gitHub, invites, members, joining, answered] = await Promise.all([
      settings.keys(id),
      managers(id),
      settings.gitHub(id),
      settings.invites(id),
      settings.members(id),
      settings.joining(id),
      read(`${base(id)}/inbox`, questions),
    ]);
    for (const part of [keys, list, gitHub, invites, members, joining, answered]) if (part._tag === "Failed") return part;
    const first = list._tag === "Loaded" ? list.value[0] : undefined;
    const isDone = {
      model: keys._tag === "Loaded" && keys.value.notReady === undefined,
      manager: first !== undefined,
      github: gitHub._tag === "Loaded" && gitHub.value.account !== undefined,
      invite:
        (invites._tag === "Loaded" && invites.value.length > 0) ||
        (members._tag === "Loaded" && members.value.length > 1) ||
        (joining._tag === "Loaded" && joining.value.linksOn),
      question: answered._tag === "Loaded" && answered.value > 0,
    };
    const only = { only: true, managerId: first?.managerId };
    const listen = teamLinks.step(id, first === undefined ? "manager" : "listen", only);
    return {
      _tag: "Loaded",
      value: [
        { key: "model", label: "Connect a model", isDone: isDone.model, href: teamLinks.step(id, "model", only) },
        { key: "manager", label: "Make a manager", isDone: isDone.manager, href: teamLinks.step(id, "manager", only) },
        { key: "email", label: "Email it", isDone: isDone.manager, href: listen },
        { key: "github", label: "Connect GitHub", isDone: isDone.github, href: listen },
        { key: "invite", label: "Invite your team", isDone: isDone.invite, href: teamLinks.step(id, "invite", only) },
        { key: "question", label: "Answer its first question", isDone: isDone.question, href: teamLinks.inbox(id) },
      ],
    };
  };

  return {
    settings,
    progress,
    managers,
    createWorkspace: async (input): Promise<Made> => {
      const made = await write("POST", "/api/workspaces", input, (body) =>
        isRecord(body) && isRecord(body["workspace"]) ? wordsOf(body["workspace"]["workspaceId"]) : undefined,
      );
      if (made._tag === "Loaded") return { kind: "made", workspaceId: made.value };
      return made.message === "Address taken" ? { kind: "taken" } : { kind: "failed", message: made.message };
    },
    workspaceName: async (id) => {
      const found = await settings.workspace(id);
      return found._tag === "Loaded" ? { _tag: "Loaded", value: found.value.name } : found;
    },
    createManager: (id, input) =>
      write("POST", `${base(id)}/managers`, input, (body) =>
        isRecord(body) && isRecord(body["manager"]) ? manager(body["manager"]) : undefined,
      ),
    say: (id, managerId, text, requestId) => write("POST", `${managerAt(id, managerId)}/chat`, { text, requestId }, done),
    hearing: (id, managerId) => read(`${managerAt(id, managerId)}/github`, hearing(managerId)),
    hear: (id, managerId, repos) => write("PUT", `${managerAt(id, managerId)}/github`, { repos: repos.map((repo) => ({ repo })) }, done),
  };
}

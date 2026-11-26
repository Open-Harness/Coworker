import { isRecord, wordsOf } from "~/modules/team-core/service.ts";
import type { Server } from "~/modules/team-core/types.ts";
import type { BuildApi } from "../types.ts";
import {
  decodeMade,
  decodeMembers,
  withMembers,
  decodeManager,
  decodePeople,
  decodePermissions,
  decodePolicy,
  decodeTemplates,
} from "./decode-manager.ts";
import { decodeEmail, decodeEvents, decodeGitHub, decodeSent, decodeSet } from "./decode-sources.ts";
import { decodeTask, decodePressed, decodeRun } from "./decode-task.ts";
import { decodeAgents, decodeDeleted, decodeGeneral, decodeSavedAgent, decodeSavedSkill, decodeSkills } from "./decode-work.ts";

const at = (workspaceId: string, path = ""): string => `/api/workspaces/${encodeURIComponent(workspaceId)}${path}`;
const under = (workspaceId: string, managerId: string, path = ""): string =>
  at(workspaceId, `/managers/${encodeURIComponent(managerId)}${path}`);

/** The build screens' API over the line to the server. */
export function createBuildApi({ read, write }: Server): BuildApi {
  return {
    general: (id) => read(at(id, "/general"), decodeGeneral),
    manager: (id, managerId) => read(under(id, managerId), decodeManager),
    press: (id, managerId, actionId, input, requestId) =>
      write("POST", under(id, managerId, `/actions/${actionId}`), { input, requestId }, decodePressed),
    policy: (id, managerId) => read(under(id, managerId, "/policy"), decodePolicy),
    setPolicy: (id, managerId, policy) => write("PUT", under(id, managerId, "/policy"), policy, decodePolicy),
    people: async (id) => {
      const [handled, members] = await Promise.all([
        read(at(id, "/people"), decodePeople),
        read(`/api/auth/organization/list-members?organizationId=${encodeURIComponent(id)}&limit=500`, decodeMembers),
      ]);
      if (handled._tag === "Failed") return handled;
      return { _tag: "Loaded", value: withMembers(handled.value, members._tag === "Loaded" ? members.value : []) };
    },
    github: (id, managerId) => read(under(id, managerId, "/github"), decodeGitHub(managerId)),
    setRepos: (id, managerId, repos) => write("PUT", under(id, managerId, "/github"), { repos }, decodeSet(managerId)),
    installUrl: (id, managerId) =>
      read(at(id, `/github?manager=${encodeURIComponent(managerId)}`), (body) =>
        isRecord(body) ? { url: wordsOf(body["installUrl"]) } : undefined,
      ),
    email: (id) => read(at(id, "/email"), decodeEmail),
    testMail: (id, managerId) => write("POST", at(id, "/email/test"), { managerId }, decodeSent),
    permissions: (id, managerId) => read(under(id, managerId, "/permissions"), decodePermissions),
    events: (id, managerId) => read(under(id, managerId, "/events"), decodeEvents),
    templates: (id) => read(at(id, "/templates"), decodeTemplates),
    createManager: (id, input) => write("POST", at(id, "/managers"), input, decodeMade),
    agents: (id) => read(at(id, "/agents"), decodeAgents),
    saveAgent: (id, { id: agent, config, note }) =>
      write(
        agent === undefined ? "POST" : "PUT",
        at(id, agent === undefined ? "/agents" : `/agents/${encodeURIComponent(agent)}`),
        { config, note },
        decodeSavedAgent,
      ),
    deleteAgent: (id, agent) => write("DELETE", at(id, `/agents/${encodeURIComponent(agent)}`), { confirm: agent }, decodeDeleted),
    skills: (id) => read(at(id, "/skills"), decodeSkills),
    saveSkill: (id, { id: skill, name, files, note }) =>
      write(
        skill === undefined ? "POST" : "PUT",
        at(id, skill === undefined ? "/skills" : `/skills/${encodeURIComponent(skill)}`),
        { name, files, note },
        decodeSavedSkill,
      ),
    deleteSkill: (id, skill) => write("DELETE", at(id, `/skills/${encodeURIComponent(skill)}`), { confirm: skill }, decodeDeleted),
    task: (id, managerId, taskId) => read(under(id, managerId, `/tasks/${encodeURIComponent(taskId)}`), decodeTask),
    run: (id, managerId, runId) => read(under(id, managerId, `/runs/${encodeURIComponent(runId)}`), decodeRun),
  };
}

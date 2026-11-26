import { isRecord, wordsOf } from "~/modules/team-core/service.ts";
import type { Loaded, Server } from "~/modules/team-core/types.ts";
import type { SettingsApi } from "../types.ts";
import { createAccountApi } from "./account-api.ts";
import { createMoreApi } from "./api-more.ts";
import { decodeInvites, decodeJoining, decodeMembers, decodePeople, decodeWorkspace, withMembers } from "./decode-team.ts";
import { decodeBilling, decodeEnvironments, decodeGitHub, decodeKeys } from "./decode-work.ts";

const done = (): true => true;
/** Adding a model answers 201 either way; only one `Added` whose test call worked can be used. */
function added(body: unknown): { readonly ok: boolean; readonly reason: string } | undefined {
  if (!isRecord(body)) return undefined;
  if (body["_tag"] !== "Added") return { ok: false, reason: wordsOf(body["reason"]) ?? "The server did not take it" };
  const check = isRecord(body["connection"]) && isRecord(body["connection"]["check"]) ? body["connection"]["check"] : {};
  return { ok: check["_tag"] === "Works", reason: `The test call failed: ${wordsOf(check["error"]) ?? "no reason given"}` };
}
const onlyAdded = (result: Loaded<{ readonly ok: boolean; readonly reason: string }>): Loaded<true> =>
  result._tag === "Failed" ? result : result.value.ok ? { _tag: "Loaded", value: true } : { _tag: "Failed", message: result.value.reason };

const at = (workspaceId: string, path = ""): string => `/api/workspaces/${encodeURIComponent(workspaceId)}${path}`;
const org = (name: string): string => `/api/auth/organization/${name}`;

export function createSettingsApi(server: Server): SettingsApi {
  const { read, write, origin } = server;
  const members: SettingsApi["members"] = (id) =>
    read(`${org("list-members")}?organizationId=${encodeURIComponent(id)}&limit=500`, decodeMembers);
  return {
    ...createMoreApi(server),
    account: createAccountApi(server),
    origin,
    workspace: (id) => read(at(id), decodeWorkspace),
    removeWorkspace: (id) => write("DELETE", at(id), undefined, done),
    members,
    invites: (id) => read(`${org("list-invitations")}?organizationId=${encodeURIComponent(id)}`, decodeInvites),
    invite: (id, email, role, again) =>
      write("POST", org("invite-member"), { organizationId: id, email, role, ...(again ? { resend: true } : {}) }, done),
    cancelInvite: (invitationId) => write("POST", org("cancel-invitation"), { invitationId }, done),
    setRole: (id, memberId, role) => write("POST", org("update-member-role"), { organizationId: id, memberId, role }, done),
    removeMember: (id, memberId) => write("POST", org("remove-member"), { organizationId: id, memberIdOrEmail: memberId }, done),
    joining: (id) => read(at(id, "/join"), decodeJoining),
    setLinks: (id, on) => write("PUT", at(id, "/join/links"), { on }, decodeJoining),
    setDomains: (id, domains) => write("PUT", at(id, "/join/domains"), { domains }, decodeJoining),
    keys: (id) => read(at(id, "/models"), decodeKeys),
    addModel: async (id, input) => onlyAdded(await write("POST", at(id, "/models"), input, added)),
    startChatGpt: (id) =>
      write("POST", at(id, "/models"), { source: "chatgpt" }, (body) => (isRecord(body) ? wordsOf(body["authorizeUrl"]) : undefined)),
    finishChatGpt: async (id, redirectUrl) => onlyAdded(await write("POST", at(id, "/models/chatgpt"), { redirectUrl }, added)),
    gitHub: (id, managerId) =>
      read(at(id, `/github${managerId === undefined ? "" : `?manager=${encodeURIComponent(managerId)}`}`), decodeGitHub),
    connectGitHub: (id, installed) => write("POST", at(id, "/github"), installed, done),
    billing: (id) => read(at(id, "/billing"), decodeBilling),
    setLimit: (id, on, overCents) => write("PUT", at(id, "/billing/limit"), { on, overCents }, decodeBilling),
    environments: (id) => read(at(id, "/environments"), decodeEnvironments),
    saveEnvironment: (id, input) => write("PUT", at(id, "/environments"), input, done),
    assignAgent: (id, agent, environment) =>
      write("PUT", at(id, `/agents/${encodeURIComponent(agent)}/environment`), { environment: environment ?? null }, done),
    storeSecret: (id, name, value) => write("PUT", at(id, `/secrets/${encodeURIComponent(name)}`), { value }, done),
    people: async (id) => {
      const [people, team] = await Promise.all([read(at(id, "/people"), decodePeople), members(id)]);
      if (people._tag === "Failed") return people;
      return { _tag: "Loaded", value: withMembers(people.value, team._tag === "Loaded" ? team.value : []) };
    },
    addHandle: (id, input) => write("POST", at(id, "/people/handles"), input, done),
  };
}

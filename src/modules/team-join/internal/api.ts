import { arrayOf, isRecord, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { Server } from "~/modules/team-core/types.ts";
import type { Invite, JoinApi, Way, Who } from "../types.ts";

const done = (): true => true;
const isWay = (value: unknown): value is Way => value === "google" || value === "github";

/** `{person: {id: "email:…", name} | null}`. */
function who(body: unknown): { readonly who: Who | null } | undefined {
  if (!isRecord(body)) return undefined;
  const person = body["person"];
  if (!isRecord(person)) return { who: null };
  const email = textOf(person["id"]).replace(/^email:/u, "");
  return { who: { name: textOf(person["name"], email), email } };
}

const STATUSES: readonly Invite["status"][] = ["open", "used", "expired", "withdrawn"];

function invite(body: unknown): Invite | undefined {
  const row = isRecord(body) ? body["invite"] : undefined;
  if (!isRecord(row) || typeof row["workspaceId"] !== "string") return undefined;
  const status = STATUSES.find((name) => name === row["status"]);
  if (status === undefined) return undefined;
  const address = textOf(row["address"]);
  return {
    status,
    email: textOf(row["email"]),
    role: row["role"] === "owner" || row["role"] === "builder" ? row["role"] : "member",
    workspaceId: row["workspaceId"],
    workspaceName: textOf(row["workspaceName"], address),
    address,
    invitedBy: textOf(row["invitedBy"], "Someone"),
  };
}

/** Better Auth gives the provider's page as `{url}`. */
const providerPage = (body: unknown): string | undefined => (isRecord(body) ? wordsOf(body["url"]) : undefined);

const ASKED = { Requested: "asked", AlreadyRequested: "waiting", AlreadyMember: "member" } as const;
const asked = (body: unknown) => {
  const tag = isRecord(body) ? body["_tag"] : undefined;
  return tag === "Requested" || tag === "AlreadyRequested" || tag === "AlreadyMember" ? ASKED[tag] : undefined;
};

export function createJoinApi({ read, write }: Server): JoinApi {
  return {
    who: async () => {
      const found = await read("/api/me", who);
      return found._tag === "Loaded" ? { _tag: "Loaded", value: found.value.who } : found;
    },
    ways: () => read("/api/sign-in", (body) => (isRecord(body) ? arrayOf(body["ways"]).filter(isWay) : undefined)),
    sendLink: (email, returnTo) => write("POST", "/api/auth/sign-in/magic-link", { email, callbackURL: returnTo }, done),
    signInWith: (provider, returnTo) =>
      write("POST", "/api/auth/sign-in/social", { provider, callbackURL: returnTo, disableRedirect: true }, providerPage),
    linkAccount: (provider, returnTo) =>
      write("POST", "/api/auth/link-social", { provider, callbackURL: returnTo, disableRedirect: true }, providerPage),
    signOut: () => write("POST", "/api/auth/sign-out", {}, done),
    invite: (id) => read(`/api/join/invite/${encodeURIComponent(id)}`, invite),
    acceptInvite: (invitationId) =>
      write("POST", "/api/auth/organization/accept-invitation", { invitationId }, (body) =>
        isRecord(body) && isRecord(body["member"]) ? wordsOf(body["member"]["organizationId"]) : undefined,
      ),
    joinByLink: (workspaceId, secret) =>
      write("POST", "/api/join/link", { workspaceId, secret }, (body) =>
        isRecord(body) && (body["_tag"] === "Joined" || body["_tag"] === "AlreadyMember") ? wordsOf(body["workspaceId"]) : undefined,
      ),
    isMember: (workspaceId) =>
      read("/api/workspaces", (body) =>
        isRecord(body) ? arrayOf(body["workspaces"]).some((row) => isRecord(row) && row["workspaceId"] === workspaceId) : undefined,
      ),
    askToJoin: (address) => write("POST", "/api/join/request", { address }, asked),
    addEmail: (email) => write("POST", "/api/me/emails", { email }, done),
    proveEmail: (token) =>
      read(`/api/me/emails/verify?token=${encodeURIComponent(token)}`, (body) => (isRecord(body) ? wordsOf(body["email"]) : undefined)),
  };
}

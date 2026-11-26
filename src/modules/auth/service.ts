import { emailProven, sendEmailProof } from "./internal/proof.ts";
import { sealed, unsealed } from "./internal/signed.ts";
import { betterAuth } from "better-auth";
import {
  accountsOf,
  approvingDomain,
  membersIn,
  membershipsOf,
  renameOrganization,
  removeOrganization,
  removeMemberFrom,
  roleIn,
  saveApprovedDomains,
  setRoleIn,
  slugTaken,
} from "./internal/control.ts";
import { authOptions } from "./internal/options.ts";
import { invitationView } from "./internal/invitation.ts";
import type { AddMemberResult, Auth, AuthDependencies, CreateOrganizationResult, SignedIn } from "./types.ts";

/** Paths only the workspaces module may take, so an organization never exists without its object. */
const RESERVED = new Set(["/api/auth/organization/create", "/api/auth/organization/delete", "/api/auth/organization/update"]);

export function createAuth({ database, mailer, settings, onSignUp, onPersonChanged, now }: AuthDependencies): Auth {
  const auth = betterAuth(authOptions(settings, mailer, database, onSignUp, onPersonChanged));
  return {
    handle: async (request) => {
      if (RESERVED.has(new URL(request.url).pathname)) return new Response("Not found", { status: 404 });
      return auth.handler(request);
    },
    signedIn: async (headers): Promise<SignedIn | undefined> => {
      const found = await auth.api.getSession({ headers });
      if (found === null) return undefined;
      return { userId: found.user.id, email: found.user.email, name: found.user.name, sessionId: found.session.id };
    },
    signInWays: [
      ...(settings.google === undefined ? [] : ["google" as const]),
      ...(settings.github === undefined ? [] : ["github" as const]),
    ],
    invitation: (id) => invitationView(database, id, now()),
    accounts: (userId) => accountsOf(database, userId),
    createOrganization: async ({ userId, name, slug }): Promise<CreateOrganizationResult> => {
      if (await slugTaken(database, slug)) return { _tag: "SlugTaken" };
      try {
        const created = await auth.api.createOrganization({ body: { name, slug, userId, keepCurrentActiveOrganization: true } });
        if (created === null) return { _tag: "Failed", message: "The organization was not created" };
        return { _tag: "Created", organizationId: created.id };
      } catch (error) {
        if (await slugTaken(database, slug)) return { _tag: "SlugTaken" };
        return { _tag: "Failed", message: error instanceof Error ? error.message : String(error) };
      }
    },
    deleteOrganization: (organizationId) => removeOrganization(database, organizationId),
    role: (userId, organizationId) => roleIn(database, userId, organizationId),
    organizationsOf: (userId) => membershipsOf(database, userId),
    addMember: async ({ userId, organizationId, role }): Promise<AddMemberResult> => {
      const existing = await roleIn(database, userId, organizationId);
      if (existing !== undefined) return { _tag: "AlreadyMember", role: existing };
      try {
        await auth.api.addMember({ body: { userId, organizationId, role } });
        return { _tag: "Added" };
      } catch (error) {
        return { _tag: "Failed", message: error instanceof Error ? error.message : String(error) };
      }
    },
    setApprovedDomains: (organizationId, domains) => saveApprovedDomains(database, organizationId, domains),
    organizationsApproving: (domain) => approvingDomain(database, domain),
    isSlugTaken: (slug) => slugTaken(database, slug),
    membersOf: (organizationId) => membersIn(database, organizationId),
    setRole: (userId, organizationId, role) => setRoleIn(database, userId, organizationId, role),
    removeMember: (userId, organizationId) => removeMemberFrom(database, userId, organizationId),
    renameOrganization: (organizationId, name, slug) => renameOrganization(database, organizationId, name, slug),
    sendEmailProof: (user, email) => sendEmailProof(settings, mailer, user, email, now()),
    emailProven: (user, token) => emailProven(settings, user, token, now()),
    gitHubState: (user, text) => sealed(settings.secret, "github-install", user.userId, text, now()),
    gitHubStateOf: (user, token) => unsealed(settings.secret, "github-install", user.userId, token, now()),
    userOf: async (userId) =>
      (await database.prepare(`SELECT "email", "name" FROM "user" WHERE "id" = ?`).bind(userId).first<{ email: string; name: string }>()) ??
      undefined,
  };
}

import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { magicLink, organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";
import type { AuthSettings, NewUser, PersonChange } from "../types.ts";
import type { Mailer } from "~/modules/mail/types.ts";

const ac = createAccessControl(defaultStatements);
/** Coarse gates only: who may open Settings, invite and delete. Single actions live in the permissions catalogue. */
const roles = {
  owner: ac.newRole({
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    team: ["create", "update", "delete"],
    ac: ["create", "read", "update", "delete"],
  }),
  builder: ac.newRole({ invitation: ["create"], team: ["create", "update"] }),
  member: ac.newRole({}),
};

const SEVEN_DAYS = 7 * 24 * 60 * 60;

/** The one place Better Auth is configured; the schema script builds the same options against an empty database. */
export function authOptions(
  settings: AuthSettings,
  mailer: Mailer,
  database: BetterAuthOptions["database"],
  onSignUp: (user: NewUser) => Promise<void> = async () => undefined,
  onChange: (change: PersonChange) => Promise<void> = async () => undefined,
) {
  const changed = (change: PersonChange) => onChange(change).catch(() => undefined);
  const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  if (settings.google !== undefined) socialProviders.google = { ...settings.google };
  if (settings.github !== undefined) socialProviders.github = { ...settings.github };
  return {
    baseURL: settings.baseUrl,
    basePath: "/api/auth",
    secret: settings.secret,
    database,
    socialProviders,
    account: { accountLinking: { enabled: true, trustedProviders: ["google", "github", "magic-link"] } },
    telemetry: { enabled: false },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => onSignUp({ userId: user.id, email: user.email, emailVerified: user.emailVerified }),
        },
      },
      account: { create: { after: async (account) => changed({ kind: "linked", userId: account.userId }) } },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const sent = await mailer.send({
            from: settings.sendFrom,
            fromName: "Co-worker",
            to: email,
            subject: "Your sign-in link",
            text: `Sign in to Co-worker: ${url}\n\nThe link works once and expires in 5 minutes.`,
          });
          // Better Auth's own way to answer with an error: without it the page says to look for a mail that never left.
          if (sent._tag === "Failed") throw new APIError("BAD_GATEWAY", { message: "The sign-in email could not be sent. Try again" });
        },
      }),
      organization({
        ac,
        roles,
        creatorRole: "owner",
        invitationExpiresIn: SEVEN_DAYS,
        organizationHooks: {
          afterAddMember: async ({ member }) => changed({ kind: "joined", userId: member.userId, organizationId: member.organizationId }),
          afterAcceptInvitation: async ({ member }) =>
            changed({ kind: "joined", userId: member.userId, organizationId: member.organizationId }),
          afterRemoveMember: async ({ member }) => changed({ kind: "left", userId: member.userId, organizationId: member.organizationId }),
        },
        sendInvitationEmail: async ({ email, organization: org, inviter, id }) => {
          await mailer.send({
            from: settings.sendFrom,
            fromName: "Co-worker",
            to: email,
            subject: `${inviter.user.name} invited you to ${org.name}`,
            text: `Join ${org.name} on Co-worker: ${settings.baseUrl}/join/invite/${id}\n\nThe invite works once and expires in 7 days.`,
          });
        },
      }),
    ],
  } satisfies BetterAuthOptions;
}

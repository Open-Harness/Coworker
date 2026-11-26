import handler from "@tanstack/react-start/server-entry";
import { createAuth } from "~/modules/auth/service.ts";
import type { AuthSettings, OAuthClient } from "~/modules/auth/types.ts";
import { randomIds, systemClock } from "~/modules/clock/service.ts";
import { createAdminCheck, createDirectoryPort, DIRECTORY_NAME, DirectoryHost } from "~/modules/directory/service.ts";
import { BoxHost } from "~/modules/sandboxes/service.ts";
import { createHttp } from "~/modules/http/service.ts";
import { createWorkspacePort, WorkspaceHost } from "~/modules/chat-host/service.ts";
import type { Report } from "~/modules/chat-host/types.ts";
import { durableManagerStores, ManagerStoreHost } from "~/modules/manager-store/service.ts";
import type { ManagerStoreApi } from "~/modules/manager-store/types.ts";
import { durableManagerObjects, ManagerHost } from "~/modules/manager/service.ts";
import type { ManagerApi, ManagerObjects } from "~/modules/manager/types.ts";
import { email } from "~/modules/email/service.ts";
import { triggers } from "~/modules/triggers/service.ts";
import { WorkspaceHost as TenantHost } from "~/modules/workspace/service.ts";
import {
  createWorkspaces,
  durableTenantObjects,
  gitHubInstallations,
  installedObject,
  workspaceAt,
  workspaceById,
} from "~/modules/workspaces/service.ts";
import { github } from "~/modules/github/service.ts";
import {
  FAKE_AUTHSERV,
  fakeInbound,
  fakeMail,
  lapseInvite,
  filesFrom,
  gitHubApiFrom,
  mailerFrom,
  masterKeysFrom,
  present,
  sandboxHostFrom,
  billingFrom,
  brainFrom,
  tenantClockFrom,
  outsideFetch,
  agentFrom,
  boxHostFrom,
  gitPortFrom,
  appSlugFrom,
  passTime,
} from "./world.ts";
import { FAKE_GITHUB_SECRET } from "~/modules/github/testing.ts";
import { faultyObjects, localJurisdictions } from "~/modules/workspaces/testing.ts";
import { consoleFrom } from "./console-root.ts";
import { gitHubIn } from "./github-root.ts";
import { readOurs } from "./templates-root.ts";
import { outsideFor } from "./working-root.ts";
import type { Env } from "./env.ts";

export type { Env };

const mailDomainOf = (env: Env): string => present(env.DT_MAIL_DOMAIN) ?? "co-worker.tech";
const sendFromOf = (env: Env): string => present(env.DT_SEND_FROM) ?? `hello@${mailDomainOf(env)}`;

const report: Report = (message, error, details = {}) =>
  console.error(JSON.stringify({ message, ...details, error: error instanceof Error ? (error.stack ?? error.message) : String(error) }));

const clientOf = (clientId = "", clientSecret = ""): OAuthClient | undefined =>
  clientId === "" || clientSecret === "" ? undefined : { clientId, clientSecret };

function authSettings(env: Env, request: Request): AuthSettings {
  const baseUrl = present(env.DT_APP_URL) ?? new URL(request.url).origin;
  const secret = present(env.BETTER_AUTH_SECRET);
  if (secret === undefined) throw new Error("BETTER_AUTH_SECRET is not set");
  return {
    baseUrl,
    secret,
    sendFrom: present(env.DT_SEND_FROM) ?? `hello@${new URL(baseUrl).hostname}`,
    google: clientOf(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET),
    github: clientOf(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET),
  };
}

/** Where workspaces' objects are. The fake world keeps jurisdictions in memory, and `tenantsFrom` arms its faults. */
const tenantObjectsFrom = (env: Env) => durableTenantObjects(env.DT_WORLD === "fake" ? localJurisdictions(env.WORKSPACE) : env.WORKSPACE);
const tenantsFrom = (env: Env) => (env.DT_WORLD === "fake" ? faultyObjects(tenantObjectsFrom(env)) : tenantObjectsFrom(env));

/** The control plane for one request. Auth's hooks (domain auto-join, Handles) run long after `workspaces` exists. */
function controlFrom(env: Env, request: Request) {
  const auth = createAuth({
    database: env.AUTH,
    mailer: mailerFrom(env),
    settings: authSettings(env, request),
    onSignUp: async (user) => void (await workspaces.joinByDomain(user)),
    onPersonChanged: (change) => workspaces.personChanged(change),
    now: systemClock.now,
  });
  const workspaces = createWorkspaces({ database: env.AUTH, auth, objects: tenantsFrom(env), clock: systemClock });
  return { auth, workspaces, managers: managerObjectsFrom(env), github: gitHubApiFrom(env) };
}

export class Directory extends DirectoryHost<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    const { models, draft } = agentFrom(env);
    const isAdmin = createAdminCheck((present(env.PI_EXP_ADMINS) ?? "").split(",").filter((email) => email.trim() !== ""));
    super(ctx, env, { workspaces: createWorkspacePort(env.WORKSPACES), models, draft, isAdmin, report });
  }
}

export class Workspace extends WorkspaceHost<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env, { agent: agentFrom(env), directory: createDirectoryPort(env.DIRECTORY), report });
  }
}

/** Where managers are made. The fake world keeps jurisdictions in memory, as for workspaces. */
const managerObjectsFrom = (env: Env): ManagerObjects =>
  durableManagerObjects(env.DT_WORLD === "fake" ? localJurisdictions<ManagerApi>(env.MANAGER) : env.MANAGER);

/** One tenant. */
export class WorkspaceObject extends TenantHost<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env, {
      clock: tenantClockFrom(env),
      masterKeys: masterKeysFrom(env),
      ids: randomIds,
      fetch: outsideFetch(env),
      managers: managerObjectsFrom(env),
      stores: managerStoresFrom(env),
      mailDomain: mailDomainOf(env),
      sandboxes: sandboxHostFrom(env),
      billing: billingFrom(env),
      github: gitHubApiFrom(env),
      mailer: mailerFrom(env),
      sendFrom: sendFromOf(env),
    });
  }
}

/** Where replies go out, per Source kind. */
const channelFrom = (env: Env) => triggers.channels({ email: email.channel(mailerFrom(env)), github: github.channel(gitHubApiFrom(env)) });

/** GitHub's webhooks, to the workspace that claimed the installation: what its managers hear is kept for them. */
const gitHubInFrom = (request: Request, env: Env): Promise<Response> =>
  gitHubIn(request, {
    secret: present(env.GITHUB_WEBHOOK_SECRET) ?? (env.DT_WORLD === "fake" ? FAKE_GITHUB_SECRET : ""),
    slug: appSlugFrom(env) ?? "",
    objectOf: installedObject(env.AUTH, tenantsFrom(env)),
    removed: (installation) => gitHubInstallations(env.AUTH, tenantsFrom(env)).removed(installation),
  });

/** Mail to `<manager>.<workspace>@<mail domain>`, from Email Routing, up to 25 MiB. */
const emailSourceFrom = (env: Env) =>
  email.source({
    mailDomain: mailDomainOf(env),
    sendFrom: sendFromOf(env),
    maxBytes: 25 * 1_048_576,
    authServId: present(env.DT_AUTHSERV_ID) ?? FAKE_AUTHSERV,
    mailbox: workspaceAt(env.AUTH, tenantsFrom(env)),
    files: filesFrom(env),
    now: systemClock.now,
  });

/** One container's object: its container starts for one command and is destroyed after it. */
export class CommandBox extends BoxHost<Env> {}

/** Staging's first container class. Nothing binds it; Cloudflare keeps a class until a migration deletes it. */
export class SandboxBox extends BoxHost<Env> {}

/** One manager: the pi-durable harness, its mission pages, board and runs. */
export class ManagerObject extends ManagerHost<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env, {
      clock: systemClock,
      brain: brainFrom(env),
      workspace: (objectId, region) => tenantObjectsFrom(env).get(objectId, region),
      channel: channelFrom(env),
      files: filesFrom(env),
      report,
    });
  }
}

/** The new managers' objects: one each, made in the workspace's jurisdiction. */
const managerStoresFrom = (env: Env) =>
  durableManagerStores(env.DT_WORLD === "fake" ? localJurisdictions<ManagerStoreApi>(env.MANAGER_STORE) : env.MANAGER_STORE);

/** One manager's own object: its playbook, its work, its conversations and its container. */
export class ManagerStore extends ManagerStoreHost<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env, {
      clock: tenantClockFrom(env),
      host: boxHostFrom(env),
      outside: outsideFor({
        workspace: workspaceById(env.AUTH, tenantsFrom(env)),
        github: gitHubApiFrom(env),
        git: gitPortFrom(env),
        fetch: outsideFetch(env),
      }),
      report: (message, error) => report(message, error),
    });
  }
}
const ours = readOurs((message) => console.error(message));

export default {
  /** Mail to a manager's address becomes a Trigger; Email Routing bounces what is rejected, with the reason. */
  email: async (message: ForwardableEmailMessage, env: Env): Promise<void> => {
    const received = await emailSourceFrom(env).receive({ from: message.from, to: message.to, raw: message.raw, rawSize: message.rawSize });
    // Awaited so a caller across RPC (a test) sees it land before the handler returns; a void result costs nothing.
    if (received._tag === "Rejected") await Promise.resolve(message.setReject(received.reason));
  },
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (pathname === "/in/github") return gitHubInFrom(request, env);
    if (env.DT_WORLD === "fake" && pathname === "/api/test/mail") return fakeMail(request);
    if (env.DT_WORLD === "fake" && pathname === "/api/test/inbound-mail") return fakeInbound(request, emailSourceFrom(env));
    if (env.DT_WORLD === "fake" && pathname === "/api/test/lapse-invite") return lapseInvite(request, env.AUTH);
    if (env.DT_WORLD === "fake" && pathname === "/api/test/time")
      return passTime(request, { workspace: workspaceById(env.AUTH, tenantsFrom(env)), stores: managerStoresFrom(env) });
    return createHttp({
      directory: () => env.DIRECTORY.getByName(DIRECTORY_NAME),
      workspace: (workspaceId) => env.WORKSPACES.getByName(workspaceId),
      pages: async (page) => handler.fetch(page),
      console: consoleFrom({
        managers: managerStoresFrom(env),
        ours,
        clock: tenantClockFrom(env),
        app: appSlugFrom(env) ?? null,
        mailDomain: mailDomainOf(env),
      }),
      control: () => controlFrom(env, request),
    })(request);
  },
};

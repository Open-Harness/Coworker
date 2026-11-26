import handler from "@tanstack/react-start/server-entry";
import { noAgent } from "~/modules/agent/service.ts";
import { createAuth } from "~/modules/auth/service.ts";
import type { AuthSettings, OAuthClient } from "~/modules/auth/types.ts";
import { randomIds, systemClock } from "~/modules/clock/service.ts";
import { BoxHost } from "~/modules/sandboxes/service.ts";
import { createHttp } from "~/modules/http/service.ts";
import { durableManagerStores, ManagerStoreHost } from "~/modules/manager-store/service.ts";
import type { ManagerStoreApi } from "~/modules/manager-store/types.ts";
import { WorkspaceHost as TenantHost } from "~/modules/workspace/service.ts";
import {
  createWorkspaces,
  durableTenantObjects,
  gitHubInstallations,
  installedObject,
  workspaceAt,
  workspaceById,
} from "~/modules/workspaces/service.ts";
import {
  FAKE_AUTHSERV,
  fakeInbound,
  fakeMail,
  lapseInvite,
  gitHubApiFrom,
  mailerFrom,
  masterKeysFrom,
  present,
  sandboxHostFrom,
  billingFrom,
  tenantClockFrom,
  outsideFetch,
  boxHostFrom,
  gitPortFrom,
  appSlugFrom,
  passTime,
} from "./world.ts";
import { FAKE_GITHUB_SECRET } from "~/modules/github/testing.ts";
import { faultyObjects, localJurisdictions } from "~/modules/workspaces/testing.ts";
import { consoleFrom } from "./console-root.ts";
import { gitHubIn } from "./github-root.ts";
import { mailIn } from "./mail-root.ts";
import { readOurs } from "./templates-root.ts";
import { outsideFor } from "./working-root.ts";
import type { Env } from "./env.ts";

export type { Env };

const mailDomainOf = (env: Env): string => present(env.DT_MAIL_DOMAIN) ?? "co-worker.tech";
const sendFromOf = (env: Env): string => present(env.DT_SEND_FROM) ?? `hello@${mailDomainOf(env)}`;

const report = (message: string, error: unknown, details: Readonly<Record<string, unknown>> = {}): void =>
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
  return { auth, workspaces, github: gitHubApiFrom(env) };
}

/** One tenant. */
export class WorkspaceObject extends TenantHost<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env, {
      clock: tenantClockFrom(env),
      masterKeys: masterKeysFrom(env),
      ids: randomIds,
      fetch: outsideFetch(env),
      stores: managerStoresFrom(env),
      // The loop is not built: what the workspace asks a model itself (the judge, the weekly look) answers NotBuilt.
      agent: noAgent,
      mailDomain: mailDomainOf(env),
      sandboxes: sandboxHostFrom(env),
      billing: billingFrom(env),
      github: gitHubApiFrom(env),
      mailer: mailerFrom(env),
      sendFrom: sendFromOf(env),
    });
  }
}

/** GitHub's webhooks, to the workspace that claimed the installation: what its managers hear is kept for them. */
const gitHubInFrom = (request: Request, env: Env): Promise<Response> =>
  gitHubIn(request, {
    secret: present(env.GITHUB_WEBHOOK_SECRET) ?? (env.DT_WORLD === "fake" ? FAKE_GITHUB_SECRET : ""),
    slug: appSlugFrom(env) ?? "",
    objectOf: installedObject(env.AUTH, tenantsFrom(env)),
    removed: (installation, how) => gitHubInstallations(env.AUTH, tenantsFrom(env)).removed(installation, how),
  });

/** Mail to `<workspace>@<mail domain>`, from Email Routing, up to 25 MiB: kept in that workspace's mailbox. */
const mailInFrom = (env: Env) => (incoming: Parameters<typeof mailIn>[1]) =>
  mailIn(
    {
      mailDomain: mailDomainOf(env),
      maxBytes: 25 * 1_048_576,
      authServId: present(env.DT_AUTHSERV_ID) ?? FAKE_AUTHSERV,
      workspace: workspaceAt(env.AUTH, tenantsFrom(env)),
      now: systemClock.now,
    },
    incoming,
  );

/** One container's object: its container starts for one command and is destroyed after it. */
export class CommandBox extends BoxHost<Env> {}

/** Staging's first container class. Nothing binds it; Cloudflare keeps a class until a migration deletes it. */
export class SandboxBox extends BoxHost<Env> {}

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
      // The loop is not built: a manager's work is taken and kept, and no thread runs.
      agent: noAgent,
      report: (message, error) => report(message, error),
    });
  }
}
const ours = readOurs((message) => console.error(message));

export default {
  /** Every hour: a workspace that an Owner deleted thirty days ago is destroyed, its objects and its rows. */
  scheduled: async (_event: ScheduledController, env: Env): Promise<void> => {
    await controlFrom(env, new Request(present(env.DT_APP_URL) ?? "https://app.invalid/")).workspaces.removeDue(systemClock.now());
  },
  /** Mail to the workspace's address is kept in its mailbox; Email Routing bounces what is rejected, with the reason. */
  email: async (message: ForwardableEmailMessage, env: Env): Promise<void> => {
    const received = await mailInFrom(env)({ from: message.from, to: message.to, raw: message.raw, rawSize: message.rawSize });
    // Awaited so a caller across RPC (a test) sees it land before the handler returns; a void result costs nothing.
    if (received._tag === "Rejected") await Promise.resolve(message.setReject(received.reason));
  },
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (pathname === "/in/github") return gitHubInFrom(request, env);
    if (env.DT_WORLD === "fake" && pathname === "/api/test/mail") return fakeMail(request);
    if (env.DT_WORLD === "fake" && pathname === "/api/test/inbound-mail") return fakeInbound(request, mailInFrom(env));
    if (env.DT_WORLD === "fake" && pathname === "/api/test/lapse-invite") return lapseInvite(request, env.AUTH);
    if (env.DT_WORLD === "fake" && pathname === "/api/test/time")
      return passTime(request, {
        workspace: workspaceById(env.AUTH, tenantsFrom(env)),
        stores: managerStoresFrom(env),
        sweep: (now) => controlFrom(env, request).workspaces.removeDue(now),
      });
    return createHttp({
      pages: async (page) => handler.fetch(page),
      console: consoleFrom({
        managers: managerStoresFrom(env),
        ours,
        clock: tenantClockFrom(env),
        app: appSlugFrom(env) ?? null,
        mailDomain: mailDomainOf(env),
        fetch: outsideFetch(env),
      }),
      control: () => controlFrom(env, request),
    })(request);
  },
};

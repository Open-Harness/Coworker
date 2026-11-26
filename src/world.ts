import { createAgent } from "~/modules/agent/service.ts";
import type { Agent } from "~/modules/agent/types.ts";
import { systemClock } from "~/modules/clock/service.ts";
import { worldClock } from "~/modules/clock/testing.ts";
import type { Clock } from "~/modules/clock/types.ts";
import { unbilled } from "~/modules/billing/service.ts";
import { billingWorld } from "~/modules/billing/testing.ts";
import type { Billing } from "~/modules/billing/types.ts";
import { eml, FAKE_AUTHSERV, fakeFiles } from "~/modules/email/testing.ts";
import type { EmailSource } from "~/modules/email/types.ts";
import { appApi } from "~/modules/github/service.ts";
import { FAKE_APP_SLUG, gitHubWorld } from "~/modules/github/testing.ts";
import type { GitHubApi } from "~/modules/github/types.ts";
import { workspaceBrain } from "~/modules/brain/service.ts";
import { scriptedBrain } from "~/modules/manager/testing.ts";
import type { MakeBrain } from "~/modules/manager/types.ts";
import { emailServiceMailer } from "~/modules/mail/service.ts";
import { outbox } from "~/modules/mail/testing.ts";
import { modelProviders } from "~/modules/models/testing.ts";
import { noBoxes, noPush } from "~/modules/boxes/service.ts";
import { httpBoxes, httpGit } from "~/modules/boxes/testing.ts";
import type { BoxHost, GitPort } from "~/modules/boxes/types.ts";
import { cloudflareContainers, noContainers } from "~/modules/sandboxes/service.ts";
import { sandboxWorld } from "~/modules/sandboxes/testing.ts";
import type { BoxHandle, SandboxHost } from "~/modules/sandboxes/types.ts";
import { r2Files } from "~/modules/triggers/service.ts";
import { secretsStoreMasterKey } from "~/modules/vault/service.ts";
import { testMasterKey } from "~/modules/vault/testing.ts";
import type { MasterKeys } from "~/modules/vault/types.ts";
import type { ManagerStores } from "~/modules/manager-store/types.ts";
import type { WorkspaceApi } from "~/modules/workspace/types.ts";
import type { Env } from "./env.ts";

/*
 * Part of the composition root, beside `main.ts`: for each outside thing in book section 2, the fake world's fake or
 * the real one. Nothing else builds either.
 */

export const present = (value: string | undefined): string | undefined => (value === undefined || value === "" ? undefined : value);

export { FAKE_AUTHSERV };

/** `DT_OUTSIDE=http`: the fake world's own people, clock and mail, but the real adapters over the network, which the evals answer. */
export const overHttp = (env: Env): boolean => env.DT_WORLD === "fake" && env.DT_OUTSIDE === "http";

/** The App's slug: its own setting, and only in the fake world the fake's. Where it is not set and not the fake world, there is none. */
export const appSlugFrom = (env: Env): string | undefined =>
  present(env.GITHUB_APP_SLUG) ?? (env.DT_WORLD === "fake" ? FAKE_APP_SLUG : undefined);

/** The fast tier's fixed key, or the Secrets Store one. Rotation adds the old one to `retired` until `rewrap` runs. */
export const masterKeysFrom = (env: Env): MasterKeys => ({
  current: env.DT_WORLD === "fake" ? testMasterKey() : secretsStoreMasterKey(present(env.DT_MASTER_KEY_ID) ?? "v1", env.VAULT_MASTER_KEY),
  retired: [],
});

/** The fake world has no network: model providers answer from their fake, and nothing else answers. */
export const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
  (await modelProviders(new Request(input, init))) ?? new Response("The fake world has no network", { status: 502 });

/** What the fake world mailed an address last, so a browser test can follow a sign-in link. */
export const fakeMail = (request: Request): Response =>
  Response.json({ text: outbox.lastTo(new URL(request.url).searchParams.get("to") ?? "")?.text ?? null });

/**
 * Mail arriving as Email Routing would hand it to the Worker, so a browser test can send a manager mail. The body is
 * `{from, to, subject, text, messageId?, dkim?}`; it answers what the Source made of it.
 */
export async function fakeInbound(request: Request, source: EmailSource): Promise<Response> {
  const body: unknown = await request.json().catch(() => undefined);
  const field = (key: string): string => {
    const value = typeof body === "object" && body !== null ? (body as Record<string, unknown>)[key] : undefined;
    return typeof value === "string" ? value : "";
  };
  const raw = eml({
    from: field("from"),
    to: field("to"),
    subject: field("subject"),
    text: field("text"),
    messageId: field("messageId") || `<${crypto.randomUUID()}@fake.test>`,
    dkim: !(typeof body === "object" && body !== null && (body as Record<string, unknown>)["dkim"] === false),
  });
  return Response.json(await source.receive({ from: field("from"), to: field("to"), raw, rawSize: raw.length }));
}

/** Makes an invite seven days old, so a browser test can open one that expired. */
export async function lapseInvite(request: Request, database: D1Database): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const lapsed = new Date(systemClock.now() - 1_000).toISOString();
  const { meta } = await database.prepare(`UPDATE "invitation" SET "expiresAt" = ? WHERE "id" = ?`).bind(lapsed, id).run();
  return Response.json({ lapsed: meta.changes });
}

export const mailerFrom = (env: Env) => (env.DT_WORLD === "fake" ? outbox : emailServiceMailer(env.EMAIL));

/** The App's sign-in client: proves who installed it. Not the sign-in client of `GITHUB_CLIENT_ID`. */
const gitHubClient = (env: Env) => {
  const [clientId, clientSecret] = [present(env.GITHUB_APP_CLIENT_ID), present(env.GITHUB_APP_CLIENT_SECRET)];
  return clientId === undefined || clientSecret === undefined ? undefined : { clientId, clientSecret };
};

/** GitHub in memory in the fake world. Without the App's settings, GitHub is out of reach. */
export const gitHubApiFrom = (env: Env): GitHubApi =>
  env.DT_WORLD === "fake" && !overHttp(env)
    ? gitHubWorld
    : appApi({
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_APP_PRIVATE_KEY,
        slug: present(env.GITHUB_APP_SLUG),
        client: gitHubClient(env),
        fetch: (i, init) => fetch(i, init),
        now: systemClock.now,
      });

export const filesFrom = (env: Env) => (env.DT_WORLD === "fake" ? fakeFiles : r2Files(env.FILES));

/** The fake world's scripted containers. A deployment with the `BOXES` binding (staging) runs on Cloudflare Containers; without it, none. */
export const sandboxHostFrom = (env: Env): SandboxHost =>
  env.DT_WORLD === "fake"
    ? sandboxWorld
    : env.BOXES === undefined
      ? noContainers
      : cloudflareContainers({ open: (name) => env.BOXES?.getByName(name) as BoxHandle }, () => crypto.randomUUID().slice(0, 8));

/** Containers for a manager's work: the evals' own over the network in the fake world; elsewhere none until Cloudflare's are behind this. */
export const boxHostFrom = (env: Env): BoxHost => (overHttp(env) ? httpBoxes((input, init) => fetch(input, init)) : noBoxes);

/** Where a branch is pushed from: the same, and nowhere else. */
export const gitPortFrom = (env: Env): GitPort => (overHttp(env) ? httpGit((input, init) => fetch(input, init)) : noPush);

/** Stripe test mode is not set up yet (book section 3): the fake world records, anywhere else nothing is charged. */
export const billingFrom = (env: Env): Billing => (env.DT_WORLD === "fake" ? billingWorld : unbilled);

/** The fake world's tenants keep a clock a test can move a month on. */
export const tenantClockFrom = (env: Env): Clock => (env.DT_WORLD === "fake" ? worldClock : systemClock);

/** What managers think with: their workspace's own model connection. The fake world scripts it, unless a test asks for the real path. */
export const brainFrom = (env: Env): MakeBrain =>
  env.DT_WORLD === "fake" && present(env.DT_MANAGER_MODEL) !== "workspace" ? () => scriptedBrain() : workspaceBrain;

/** What a tenant's own calls to the outside go through: the fake world's fake, or the network. */
export const outsideFetch = (env: Env): typeof fetch =>
  env.DT_WORLD === "fake" && !overHttp(env) ? fakeFetch : (input, init) => fetch(input, init);

function proxyFrom(env: Env) {
  const [url, key] = [present(env.PI_EXP_PROXY_URL), present(env.PI_EXP_PROXY_KEY)];
  if (url === undefined) return undefined;
  const models = (present(env.PI_EXP_PROXY_MODELS) ?? "gpt-6-luna").split(",").map((model) => model.trim());
  return { url, models, ...(key === undefined ? {} : { key }) };
}

export const agentFrom = (env: Env): Agent =>
  createAgent({
    openaiKey: present(env.OPENAI_API_KEY),
    anthropicKey: present(env.ANTHROPIC_API_KEY),
    proxy: proxyFrom(env),
    defaultModel: present(env.PI_EXP_DEFAULT_MODEL),
    fakeModel: env.PI_EXP_FAKE_MODEL === "1",
    fetch: (input, init) => fetch(input, init),
  });

/**
 * The fake world's time, which a test moves: `{workspace, pass}` moves the clock by `pass` milliseconds and does everything of that
 * workspace that is due, before it answers. Time does not pass by itself here: what waits for a date waits until this.
 */
export async function passTime(
  request: Request,
  deps: { readonly workspace: (id: string) => Promise<WorkspaceApi | undefined>; readonly stores: ManagerStores },
): Promise<Response> {
  const body: unknown = await request.json().catch(() => undefined);
  const asked = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const [id, pass] = [typeof asked["workspace"] === "string" ? asked["workspace"] : "", Number(asked["pass"] ?? 0)];
  const object = await deps.workspace(id);
  if (object === undefined || !Number.isFinite(pass))
    return Response.json({ says: "There is no such workspace, or no such time." }, { status: 404 });
  worldClock.set(worldClock.now() + pass);
  await object.tick();
  const rows = await object.consoleStore({ op: "manager.list" });
  if ("op" in rows && rows.op === "manager.list")
    await Promise.all(rows.rows.map(({ objectId, region }) => deps.stores.get(objectId, region).tick()));
  return Response.json({ now: worldClock.now() });
}

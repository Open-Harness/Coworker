import { exports } from "cloudflare:workers";
import examples from "@octokit/webhooks-examples";
import { sign } from "@octokit/webhooks-methods";
import { FAKE_GITHUB_SECRET, gitHubWorld } from "~/modules/github/testing.ts";
import type { GitHubConnection } from "~/modules/github/types.ts";
import { APP, json } from "./flows.ts";
import type { Team } from "./team.ts";

/*
 * GitHub's own example payloads (`@octokit/webhooks-examples`), changed only where a test says, and signed the way
 * GitHub signs them (`@octokit/webhooks-methods`).
 */

const worker = (exports as unknown as { default: { fetch(request: Request): Promise<Response> } }).default;
type Json = Record<string, unknown>;
const isJson = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/** The first example GitHub publishes for this event and action. */
export function example(event: string, action: string, which = 0): Json {
  const found = (examples as unknown as { name: string; examples: Json[] }[])
    .find(({ name }) => name === event)
    ?.examples.filter((entry) => entry["action"] === action)[which];
  if (found === undefined) throw new Error(`No example for ${event}.${action}`);
  return structuredClone(found);
}

/** Objects merge, anything else replaces. */
export function changed(base: Json, change: Json): Json {
  const result: Json = { ...base };
  for (const [key, value] of Object.entries(change)) {
    const before = result[key];
    result[key] = isJson(before) && isJson(value) ? changed(before, value) : value;
  }
  return result;
}

export const person = (id: number, login: string) => ({ id, login, type: "User" });
export const AMA = person(5001, "ama-gh");
export const BO = person(5002, "bo-gh");

/** An event on `repo` from `sender`, through this installation. */
export const on = (installation: number, repo: string, sender: Json, event: string, action: string, change: Json = {}, which = 0): Json =>
  changed(example(event, action, which), {
    installation: { id: installation },
    repository: { full_name: repo, name: repo.split("/")[1], owner: { login: repo.split("/")[0] } },
    sender,
    ...change,
  });

let deliveries = 0;

/** POSTs a delivery to `/in/github`, signed with the fake world's secret unless told otherwise. */
export async function deliver(event: string, payload: Json, options: { id?: string; secret?: string | null } = {}): Promise<Response> {
  const body = JSON.stringify(payload);
  deliveries += 1;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-github-event": event,
    "x-github-delivery": options.id ?? `delivery-${deliveries}-${crypto.randomUUID()}`,
  };
  if (options.secret !== null) headers["x-hub-signature-256"] = await sign(options.secret ?? FAKE_GITHUB_SECRET, body);
  return worker.fetch(new Request(`${APP}/in/github`, { method: "POST", headers, body }));
}

/** The state GitHub's install page is opened with, by the team's Owner. */
export async function installState(launch: Team): Promise<string> {
  const { installUrl = "" } = await json<{ installUrl?: string }>(await launch.owner.send("GET", `${launch.workspace}/github`));
  return new URL(installUrl, APP).searchParams.get("state") ?? "";
}

/** Installs the App on `account` (in the fake GitHub), and connects it to the team's workspace. */
export async function installed(launch: Team, id: number, repos: readonly string[]): Promise<Response> {
  gitHubWorld.install({ id, account: repos[0]?.split("/")[0] ?? "acme", repos });
  return launch.owner.send("POST", `${launch.workspace}/github`, {
    installationId: id,
    code: gitHubWorld.signIn(id),
    state: await installState(launch),
  });
}

export const connection = async (launch: Team): Promise<GitHubConnection> =>
  (await json<{ github: GitHubConnection }>(await launch.owner.send("GET", `${launch.workspace}/github`))).github;

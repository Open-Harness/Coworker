import type { GitHubConnection } from "~/modules/github/types.ts";
import type { ModelConnection } from "~/modules/models/types.ts";
import type { EnvironmentView, SaveResult } from "~/modules/sandboxes/types.ts";
import type { CreateManagerResult, ManagerEntry } from "~/modules/workspace/types.ts";
import type { CreateWorkspaceResult, WorkspaceEntry } from "~/modules/workspaces/types.ts";
import type { Failed, Provisioned, Seed, Session } from "../types.ts";

const failed = (reason: string): Failed => ({ _tag: "Failed", reason });
const isFailed = (value: unknown): value is Failed =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "Failed";

async function workspaceOf(session: Session, seed: Seed): Promise<string | Failed> {
  const { workspaces } = await session.json<{ workspaces: readonly WorkspaceEntry[] }>("GET", "/api/workspaces");
  const found = workspaces.find(({ address }) => address === seed.workspace.address);
  if (found !== undefined) return found.workspaceId;
  const made = await session.json<CreateWorkspaceResult>("POST", "/api/workspaces", { ...seed.workspace, region: "eu" });
  return made._tag === "Created"
    ? made.workspace.workspaceId
    : failed(`The workspace ${seed.workspace.address} was not made: ${made._tag}`);
}

/** The workspace's own endpoint, added once (by its address), and a check that managers can think with it. */
async function endpointOf(session: Session, path: string, seed: Seed): Promise<Failed | undefined> {
  const { connections } = await session.json<{ connections: readonly ModelConnection[] }>("GET", `${path}/models`);
  if (!connections.some(({ baseUrl }) => baseUrl === seed.endpoint.baseUrl)) {
    const added = await session.json<{ _tag: string; reason?: string }>("POST", `${path}/models`, { source: "endpoint", ...seed.endpoint });
    if (added._tag !== "Added") return failed(`The model endpoint was refused: ${added.reason ?? added._tag}`);
  }
  const { readiness } = await session.json<{ readiness: { _tag: string; reason?: string } }>("GET", `${path}/models`);
  return readiness._tag === "Ready" ? undefined : failed(`Managers have no model: ${readiness.reason ?? readiness._tag}`);
}

async function managerOf(session: Session, path: string, seed: Seed): Promise<ManagerEntry | Failed> {
  const { managers } = await session.json<{ managers: readonly ManagerEntry[] }>("GET", `${path}/managers`);
  const found = managers.find(({ slug }) => slug === seed.manager.address);
  if (found !== undefined) return found;
  const made = await session.json<CreateManagerResult>("POST", `${path}/managers`, {
    name: seed.manager.name,
    template: "kanban",
    address: seed.manager.address,
  });
  return made._tag === "Created" ? made.manager : failed(`The manager ${seed.manager.name} was not made: ${made._tag}`);
}

/** The agent `Worker` runs its commands in an environment of this name, which has no setup. */
async function environmentOf(session: Session, path: string, name: string): Promise<Failed | undefined> {
  const { environments } = await session.json<{ environments: readonly EnvironmentView[] }>("GET", `${path}/environments`);
  let id = environments.find((environment) => environment.name === name)?.id;
  if (id === undefined) {
    const saved = await session.json<SaveResult>("PUT", `${path}/environments`, { name, setup: "", size: "1 vCPU · 2 GB" });
    if (saved._tag !== "Saved") return failed(`The environment was not saved: ${saved._tag}`);
    id = saved.environment.id;
  }
  const assigned = await session.send("PUT", `${path}/agents/Worker/environment`, { environment: id });
  return assigned.ok ? undefined : failed(`The agent was not given the environment (${assigned.status})`);
}

/** Creates or finds everything the live tests stand on, and makes the manager's policy and repos what the seed says. */
export async function provision(session: Session, seed: Seed): Promise<Provisioned | Failed> {
  const id = await workspaceOf(session, seed);
  if (isFailed(id)) return id;
  const workspace = `/api/workspaces/${id}`;
  const noModel = await endpointOf(session, workspace, seed);
  if (noModel !== undefined) return noModel;
  const manager = await managerOf(session, workspace, seed);
  if (isFailed(manager)) return manager;
  const base = `${workspace}/managers/${manager.managerId}`;
  const allowed = [
    ...seed.allow.emails.map((email) => ({ kind: "handle", handle: { kind: "email", id: email.toLowerCase() } })),
    ...seed.allow.githubIds.map((githubId) => ({ kind: "handle", handle: { kind: "github", id: githubId } })),
  ];
  const policy = await session.send("PUT", `${base}/policy`, { acceptMode: "observe", allowed });
  if (!policy.ok) return failed(`The manager's policy was not set (${policy.status})`);
  if (seed.environment !== undefined) {
    const noEnvironment = await environmentOf(session, workspace, seed.environment);
    if (noEnvironment !== undefined) return noEnvironment;
  }
  const { github } = await session.json<{ github: GitHubConnection }>("GET", `${workspace}/github`);
  if (seed.repo !== undefined) {
    if (github.installation === undefined) {
      return failed("The GitHub App is not installed on the test workspace: install it from Settings, Keys and connections, in the app");
    }
    const heard = await session.send("PUT", `${base}/github`, { repos: [{ repo: seed.repo, events: ["issues", "issue_comment"] }] });
    if (!heard.ok) return failed(`The repo ${seed.repo} was not given to the manager (${heard.status}): is it one the App reaches?`);
  }
  return { workspace, manager, base, github: (await session.json<{ github: GitHubConnection }>("GET", `${workspace}/github`)).github };
}

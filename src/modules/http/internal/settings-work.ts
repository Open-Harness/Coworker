import { checkAgentConfig } from "~/modules/agents/service.ts";
import { TOOL_IDS } from "~/modules/agents/types.ts";
import type { SignedIn } from "~/modules/auth/types.ts";
import type { SkillFiles, WhenReached } from "~/modules/settings/types.ts";
import type { Workspaces } from "~/modules/workspaces/types.ts";
import { bodyOf, confirmed, fresh, isRecord, problem, reach, said, settings, text } from "./kit.ts";

/**
 * What Owners and Builders build: environments to delete and test, agents and skills with their versions. And what
 * Owners watch: usage and the budgets on it.
 */

const BUILDERS = "Only Owners and Builders change what runs in the workspace";
const filesOf = (value: unknown): SkillFiles | undefined =>
  isRecord(value) && Object.values(value).every((body) => typeof body === "string") ? (value as SkillFiles) : undefined;

async function build(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  part: string,
): Promise<Response | undefined> {
  const environment = /^environments\/([A-Za-z0-9_-]{4,80})(\/test)?$/u.exec(part);
  const kind = /^(agents|skills)(?:\/([A-Za-z0-9_-]{4,80}))?$/u.exec(part);
  if (environment === null && kind === null) return undefined;
  const reading = request.method === "GET";
  const reached = await reach(workspaces, person, workspaceId, "member", "");
  if (reached instanceof Response) return reached;
  const { object, role } = reached;
  if (!reading && role === "member") return problem(403, BUILDERS);
  const [, id = "", test] = environment ?? [];
  if (environment !== null && test !== undefined) {
    if (request.method !== "POST") return problem(405, "Use POST");
    const tested = await settings(object, person, "testEnvironment", { id });
    return tested instanceof Response ? tested : said(tested);
  }
  if (environment !== null) {
    if (request.method !== "DELETE") return problem(405, "Use DELETE");
    if (!(await confirmed(request, id))) return problem(400, `Send {"confirm": "${id}"} to delete this environment`);
    const deleted = await settings(object, person, "deleteEnvironment", { id });
    return deleted instanceof Response ? deleted : said(deleted);
  }
  const [, what, thing] = kind ?? [];
  if (reading && thing === undefined) {
    if (what === "skills") {
      const skills = await settings(object, person, "skills", null);
      return skills instanceof Response ? skills : fresh({ skills });
    }
    const agents = await settings(object, person, "agents", null);
    if (agents instanceof Response) return agents;
    // Everyone reads Agents, and an environment's setup is for Owners and Builders: here it is only its name.
    const environments = (await object.environments()).map(({ id: key, name }) => ({ id: key, name }));
    return fresh({ agents, tools: TOOL_IDS, environments });
  }
  const body = request.method === "DELETE" ? undefined : await bodyOf(request);
  if (request.method === "DELETE") {
    if (thing === undefined) return problem(405, "Use DELETE on one");
    if (!(await confirmed(request, thing))) return problem(400, `Send {"confirm": "${thing}"} to delete it`);
    const deleted =
      what === "agents"
        ? await settings(object, person, "deleteAgent", { id: thing })
        : await settings(object, person, "deleteSkill", { id: thing });
    return deleted instanceof Response ? deleted : said(deleted);
  }
  if (reading || (request.method !== "POST" && request.method !== "PUT") || body === undefined)
    return problem(400, "Send a JSON body with POST or PUT");
  const note = text(body["note"]);
  if (what === "agents") {
    if ("environment" in body) return problem(400, "environment is a setting of the agent: send it in config");
    const config = checkAgentConfig(body["config"]);
    if (!config.ok) return problem(400, config.reason);
    const saved = await settings(object, person, "saveAgent", {
      ...(thing === undefined ? {} : { id: thing }),
      config: config.value,
      ...(note === undefined ? {} : { note }),
    });
    return saved instanceof Response ? saved : said(saved, request.method === "POST" ? 201 : 200);
  }
  const [name, files] = [text(body["name"]), filesOf(body["files"])];
  if (name === undefined || files === undefined) return problem(400, "Send name and files ({path: text})");
  const saved = await settings(object, person, "saveSkill", {
    ...(thing === undefined ? {} : { id: thing }),
    name,
    files,
    ...(note === undefined ? {} : { note }),
  });
  return saved instanceof Response ? saved : said(saved, request.method === "POST" ? 201 : 200);
}

async function usage(workspaces: Workspaces, person: SignedIn, request: Request, workspaceId: string, part: string): Promise<Response> {
  const reached = await reach(workspaces, person, workspaceId, "settings", "Only an Owner sees usage and sets budgets");
  if (reached instanceof Response) return reached;
  if (part === "usage") {
    if (request.method !== "GET") return problem(405, "Use GET");
    const used = await settings(reached.object, person, "usage", null);
    return used instanceof Response ? used : fresh({ usage: used });
  }
  if (request.method !== "PUT") return problem(405, "Use PUT");
  const body = await bodyOf(request);
  const [managerId, budget] = [text(body?.["managerId"]), body?.["budget"]];
  const when: unknown = isRecord(budget) ? budget["whenReached"] : undefined;
  const valid = budget === null || (isRecord(budget) && typeof budget["hours"] === "number" && (when === "stop" || when === "tell"));
  if (managerId === undefined || !valid)
    return problem(400, "Send managerId and budget ({hours, whenReached: stop or tell}, or null to remove)");
  const set = await settings(reached.object, person, "setBudget", {
    managerId,
    budget: isRecord(budget) ? { hours: Number(budget["hours"]), whenReached: when as WhenReached } : null,
  });
  return set instanceof Response ? set : said(set);
}

export async function routeWork(
  workspaces: Workspaces,
  person: SignedIn,
  request: Request,
  workspaceId: string,
  part: string,
): Promise<Response | undefined> {
  if (part === "usage" || part === "budgets") return usage(workspaces, person, request, workspaceId, part);
  return build(workspaces, person, request, workspaceId, part);
}

import type { Answer } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Call, ConsoleDeps } from "../types.ts";
import { auditView } from "./audit.ts";
import { run } from "./do.ts";
import { intakeView, boardView, playbookView } from "./manager-views.ts";
import { ok, problem } from "./around.ts";
import { overviewView, treeView } from "./overview.ts";
import {
  billingView,
  connectorsView,
  generalView,
  githubView,
  keysView,
  mcpView,
  meView,
  membersView,
  sharedView,
  usageView,
} from "./settings.ts";
import { chatsView, coworkerView, homeView, inboxView, shellView } from "./shell.ts";
import { fillView, templatesView } from "./templates.ts";

/* The paths of `api/types.ts`, each to the view it answers. A path that is not here is 404 in words. */

type Part = (c: ConsoleDeps, parts: readonly string[], query: URLSearchParams) => Promise<Answer<unknown>> | Answer<unknown>;

const READS: readonly (readonly [RegExp, Part])[] = [
  [/^\/shell$/u, async (c) => ok(await shellView(c))],
  [/^\/home$/u, () => ok(homeView())],
  [/^\/inbox$/u, () => ok(inboxView())],
  [/^\/chats$/u, () => ok(chatsView())],
  [/^\/overview$/u, async (c, _, q) => ok(await overviewView(c, q))],
  [/^\/tree$/u, async (c) => ok(await treeView(c))],
  [/^\/coworker$/u, async (c) => ok(await coworkerView(c))],
  [/^\/templates$/u, async (c) => ok(await templatesView(c))],
  [/^\/templates\/([^/]+)$/u, (c, [id]) => fillView(c, id ?? "")],
  [/^\/settings\/general$/u, async (c) => ok(await generalView(c))],
  [/^\/settings\/members$/u, (c) => ok(membersView(c))],
  [/^\/settings\/keys$/u, async (c) => ok(await keysView(c))],
  [/^\/settings\/usage$/u, async (c) => ok(await usageView(c))],
  [/^\/settings\/audit-log$/u, async (c, _, q) => ok(await auditView(c, q))],
  [/^\/settings\/billing$/u, async (c) => ok(await billingView(c))],
  [/^\/settings\/connectors$/u, async (c) => ok(await connectorsView(c))],
  [/^\/settings\/connectors\/github$/u, async (c) => ok(await githubView(c))],
  [/^\/settings\/mcp-servers$/u, () => ok(mcpView())],
  [/^\/settings\/shared$/u, () => ok(sharedView())],
  [/^\/settings\/me$/u, async (c) => ok(await meView(c))],
  [/^\/m\/([^/]+)\/board$/u, (c, [id]) => boardView(c, id ?? "")],
  [/^\/m\/([^/]+)\/playbook$/u, (c, [id], q) => playbookView(c, id ?? "", Number(q.get("version")) || undefined)],
  [/^\/m\/([^/]+)\/intake$/u, (c, [id], q) => intakeView(c, id ?? "", q)],
];

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

async function walk(body: unknown): Promise<Answer<unknown>> {
  if (!isRecord(body) || typeof body["doing"] !== "string") return problem(422, "Send {doing, values}.");
  const values = isRecord(body["values"]) ? body["values"] : {};
  const words = Object.fromEntries(Object.entries(values).flatMap(([name, value]) => (typeof value === "string" ? [[name, value]] : [])));
  if (!doings.all.some(({ id }) => id === body["doing"])) return problem(404, `"${body["doing"]}" is not something that can be done here.`);
  return ok({ steps: doings.walk(body["doing"], words) });
}

export async function read({ path, query }: Call, c: ConsoleDeps): Promise<Answer<unknown>> {
  for (const [pattern, answer] of READS) {
    const found = pattern.exec(path);
    if (found !== null) return answer(c, found.slice(1).map(decodeURIComponent), query);
  }
  return problem(404, `There is nothing at ${path}.`);
}

export async function write({ path, body }: Call, c: ConsoleDeps): Promise<Answer<unknown>> {
  if (path === "/do") return run(c, body);
  if (path === "/walk") return walk(body);
  return problem(404, `There is nothing to send to ${path}.`);
}

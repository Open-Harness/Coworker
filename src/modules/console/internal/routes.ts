import type { Answer } from "~/modules/api/types.ts";
import { doings } from "~/modules/doings/service.ts";
import type { Call, ConsoleDeps } from "../types.ts";
import { auditView } from "./audit.ts";
import { chatsList, startChat } from "./chats.ts";
import { managerOverview } from "./manager-overview.ts";
import { searchView } from "./search.ts";
import { tryTemplate } from "./try.ts";
import { workView } from "./work-view.ts";
import { run } from "./do.ts";
import { boardView } from "./board.ts";
import { intakeView, playbookView } from "./manager-views.ts";
import { versionsView } from "./versions-view.ts";
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
import { answerAsk, inboxView } from "./inbox.ts";
import { threadsView } from "./threads-view.ts";
import { coworkerView, homeView, shellView } from "./shell.ts";
import { fillView, templatesView } from "./templates.ts";
import { readSetUp, sayInSetUp, startSetUp } from "./set-up.ts";

/* The paths of `api/types.ts`, each to the view it answers. A path that is not here is 404 in words. */

type Part = (c: ConsoleDeps, parts: readonly string[], query: URLSearchParams) => Promise<Answer<unknown>> | Answer<unknown>;

const READS: readonly (readonly [RegExp, Part])[] = [
  [/^\/shell$/u, async (c) => ok(await shellView(c))],
  [/^\/home$/u, () => ok(homeView())],
  [/^\/inbox$/u, async (c) => ok(await inboxView(c))],
  [/^\/chats$/u, async (c) => ok(await chatsList(c))],
  [/^\/search$/u, (c, _, q) => searchView(c, q)],
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
  [/^\/m\/([^/]+)$/u, (c, [id]) => managerOverview(c, id ?? "")],
  [/^\/m\/([^/]+)\/work\/([^/]+)$/u, (c, [id, work]) => workView(c, id ?? "", work ?? "")],
  [/^\/set-up\/([^/]+)$/u, (c, [id]) => readSetUp(c, id ?? "")],
  [/^\/m\/([^/]+)\/board$/u, (c, [id]) => boardView(c, id ?? "")],
  [/^\/m\/([^/]+)$/u, (c, [id]) => managerOverview(c, id ?? "")],
  [/^\/m\/([^/]+)\/work\/([^/]+)$/u, (c, [id, work]) => workView(c, id ?? "", work ?? "")],
  [/^\/m\/([^/]+)\/threads$/u, (c, [id]) => threadsView(c, id ?? "")],
  [/^\/m\/([^/]+)\/playbook$/u, (c, [id], q) => playbookView(c, id ?? "", Number(q.get("version")) || undefined)],
  [/^\/m\/([^/]+)\/intake$/u, (c, [id], q) => intakeView(c, id ?? "", q)],
  [/^\/m\/([^/]+)\/versions$/u, (c, [id]) => versionsView(c, id ?? "")],
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
  if (path === "/chats") return startChat(c, body);
  const tried = /^\/templates\/([^/]+)\/try$/u.exec(path);
  if (tried !== null) return tryTemplate(c, decodeURIComponent(tried[1] ?? ""), body);
  const asked = /^\/inbox\/([^/]+)$/u.exec(path);
  if (asked !== null) return answerAsk(c, decodeURIComponent(asked[1] ?? ""), body);
  if (path === "/set-up") return startSetUp(c, body);
  const inSetUp = /^\/set-up\/([^/]+)$/u.exec(path);
  if (inSetUp !== null) return sayInSetUp(c, decodeURIComponent(inSetUp[1] ?? ""), body);
  return problem(404, `There is nothing to send to ${path}.`);
}

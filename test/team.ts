import type { BoardView, ChatLine, RunView } from "~/modules/manager/types.ts";
import { FAKE_KEYS } from "~/modules/models/testing.ts";
import type { AuditEntry, CreateManagerResult, InboxItem, ManagerEntry } from "~/modules/workspace/types.ts";
import type { CreateWorkspaceResult } from "~/modules/workspaces/types.ts";
import { type Browser, json, signUp } from "./flows.ts";

/** A signed-up Owner with a workspace, a model key and one manager, "Launch", reached over HTTP. */
export interface Team {
  readonly owner: Browser;
  readonly workspace: string;
  readonly base: string;
  readonly manager: ManagerEntry;
}

export async function team(address: string, template = "kanban"): Promise<Team> {
  const owner = await signUp(`${address}@example.test`, "Ama");
  const created = await json<CreateWorkspaceResult>(await owner.send("POST", "/api/workspaces", { name: address, address, region: "eu" }));
  if (created._tag !== "Created") throw new Error(created._tag);
  const workspace = `/api/workspaces/${created.workspace.workspaceId}`;
  await owner.send("POST", `${workspace}/models`, { source: "anthropic", key: FAKE_KEYS.anthropic });
  const made = await json<CreateManagerResult>(await owner.send("POST", `${workspace}/managers`, { name: "Launch", template }));
  if (made._tag !== "Created") throw new Error(made._tag);
  return { owner, workspace, base: `${workspace}/managers/${made.manager.managerId}`, manager: made.manager };
}

export const board = async ({ owner, base }: Team): Promise<BoardView> =>
  (await json<{ board: BoardView }>(await owner.send("GET", base))).board;
export const chatLog = async ({ owner, base }: Team): Promise<readonly ChatLine[]> => json(await owner.send("GET", `${base}/chat`));
export const say = ({ owner, base }: Team, text: string, requestId: string): Promise<Response> =>
  owner.send("POST", `${base}/chat`, { text, requestId });
export const runOf = async (
  { owner, base }: Team,
  runId: string,
): Promise<{ readonly run: RunView; readonly lines: readonly ChatLine[] }> => json(await owner.send("GET", `${base}/runs/${runId}`));

/** Someone who joins the team's workspace by its invite link, as a Member. */
export async function member(launch: Team, email: string, name: string): Promise<Browser> {
  const on = await json<{ linkPath?: string }>(await launch.owner.send("PUT", `${launch.workspace}/join/links`, { on: true }));
  const [, workspaceId = "", secret = ""] = /^\/join\/link\/([^/]+)\/([^/]+)$/u.exec(on.linkPath ?? "") ?? [];
  const person = await signUp(email, name);
  const joined = await person.send("POST", "/api/join/link", { workspaceId, secret });
  if (!joined.ok) throw new Error(`Joining failed: ${joined.status}`);
  return person;
}

export const inbox = async (person: Browser, launch: Team): Promise<readonly InboxItem[]> =>
  (await json<{ items: readonly InboxItem[] }>(await person.send("GET", `${launch.workspace}/inbox`))).items;

export const audit = async (launch: Team): Promise<readonly AuditEntry[]> =>
  (await json<{ entries: readonly AuditEntry[] }>(await launch.owner.send("GET", `${launch.workspace}/audit`))).entries;

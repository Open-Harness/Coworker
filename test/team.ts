import { FAKE_KEYS } from "~/modules/models/testing.ts";
import type { AuditEntry, InboxItem } from "~/modules/workspace/types.ts";
import type { CreateWorkspaceResult } from "~/modules/workspaces/types.ts";
import { type Browser, json, signUp } from "./flows.ts";

/** A signed-up Owner with a workspace, a model key and one manager, "Launch", reached over HTTP. */
/** A workspace with its Owner and a model key. The first product's manager it also made went with that product's core. */
export interface Team {
  readonly owner: Browser;
  readonly workspace: string;
}

export async function team(address: string): Promise<Team> {
  const owner = await signUp(`${address}@example.test`, "Ama");
  const created = await json<CreateWorkspaceResult>(await owner.send("POST", "/api/workspaces", { name: address, address, region: "eu" }));
  if (created._tag !== "Created") throw new Error(created._tag);
  const workspace = `/api/workspaces/${created.workspace.workspaceId}`;
  await owner.send("POST", `${workspace}/models`, { source: "anthropic", key: FAKE_KEYS.anthropic });
  return { owner, workspace };
}

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
